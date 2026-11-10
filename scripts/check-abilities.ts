/**
 * Dev helper: checks the bundled ability snapshot against the League wiki
 * and writes two things:
 *
 *   docs/ability-review.md              what a person should look at
 *   src/data/curated/crowdControl.json  crowd control durations drafted from
 *                                       the wiki; rows a person verified or
 *                                       typed by hand are kept as they are
 *
 *   npm run check-abilities                       # whole roster
 *   npm run check-abilities -- --champs Zed,Ahri  # a few champions
 *   npm run check-abilities -- --offline          # cached wiki pages only
 *
 * Wiki pages are cached under node_modules/.cache so a rerun is quick.
 * Data Dragon stays the source the app reads; the wiki is only a check.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ABILITY_SLOTS,
  CROWD_CONTROL_KINDS,
  loadBundledAbilities,
  type Ability,
  type AbilitySlot,
  type ChampionAbilities,
  type CrowdControlKind,
  type RankValues,
} from '../src/data/abilities.ts'
import {
  CrowdControlEntries,
  curationKey,
  loadBundledCuration,
  type CrowdControlEntry,
} from '../src/data/abilityCuration.ts'
import { displayPatchFromDataDragon } from '../src/data/patch.ts'
import {
  GLOBAL_RANGE,
  displayAbilities,
  formatRanks,
  type DisplayAbility,
} from '../src/model/abilityDisplay.ts'

const ROOT = join(import.meta.dirname, '..')
const CACHE_DIR = join(ROOT, 'node_modules', '.cache', 'matchup-notebook', 'wiki')
const REVIEW_PATH = join(ROOT, 'docs', 'ability-review.md')
const CROWD_CONTROL_PATH = join(ROOT, 'src', 'data', 'curated', 'crowdControl.json')
const WIKI_BASE = 'https://wiki.leagueoflegends.com/en-us'
const USER_AGENT = 'matchup-notebook-check-abilities/0.1 (solo hobby project)'
const REQUEST_GAP_MS = 150
/** Ranges this far apart are a convention difference, not an error. */
const RANGE_TOLERANCE = 50
const KNOWN_COST_UNITS = new Set(['', 'mana', 'energy', 'health', 'grit'])

const args = process.argv.slice(2)
const offline = args.includes('--offline')
const champsIndex = args.indexOf('--champs')
const onlyChamps = champsIndex >= 0 ? new Set(args[champsIndex + 1]?.split(',')) : undefined

// ---- wiki access ----

async function fetchWiki(title: string): Promise<string | undefined> {
  mkdirSync(CACHE_DIR, { recursive: true })
  const file = join(CACHE_DIR, `${title.replace(/[^A-Za-z0-9]/g, '_')}.txt`)
  if (existsSync(file)) return readFileSync(file, 'utf8')
  if (offline) return undefined
  const url = `${WIKI_BASE}/${encodeURI(title.replace(/ /g, '_'))}?action=raw`
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS))
  if (!response.ok) return undefined
  const text = await response.text()
  writeFileSync(file, text)
  return text
}

interface WikiChampion {
  wikiName: string
  skills: Partial<Record<AbilitySlot, string>>
}

/** Module:ChampionData/data, a Lua table: apiname and the four skill names per champion. */
function parseChampionModule(lua: string): Map<string, WikiChampion> {
  const map = new Map<string, WikiChampion>()
  const block = /^ {2}\["([^"]+)"\] = \{\n([\s\S]*?)^ {2}\},$/gm
  for (const match of lua.matchAll(block)) {
    const [, wikiName = '', body = ''] = match
    const apiName = /\["apiname"\]\s*=\s*"([^"]+)"/.exec(body)?.[1]
    if (!apiName) continue
    const skills: Partial<Record<AbilitySlot, string>> = {}
    for (const slot of ABILITY_SLOTS) {
      const skill = new RegExp(
        `\\["skill_${slot.toLowerCase()}"\\]\\s*=\\s*\\{\\[1\\]\\s*=\\s*"([^"]+)"`,
      ).exec(body)
      if (skill?.[1]) skills[slot] = skill[1]
    }
    map.set(apiName, { wikiName, skills })
  }
  return map
}

/** {{tt|value|note}} to value, {{fd|x}} to x, drop tips. Repeats until nothing changes. */
function stripTemplates(text: string): string {
  let previous: string
  let current = text
  do {
    previous = current
    current = current
      .replace(/\{\{tt\|([^|{}]*)\|[^{}]*\}\}/g, '$1')
      .replace(/\{\{fd\|([^|{}]*)\}\}/g, '$1')
      .replace(/\{\{tip\|[^{}]*\}\}/g, '')
      .replace(/\{\{sbc\|[^{}]*\}\}/g, '')
  } while (current !== previous)
  return current
}

type WikiValue = RankValues | 'formula' | 'unparsed' | undefined

const round = (value: number) => Math.round(value * 1000) / 1000

/** "{{ap|15 to 10}}", "{{ap|50|55|60}}" or "10" into ranks; formulas and odd text are named. */
function parseWikiRanks(raw: string | undefined, maxRank: number): WikiValue {
  if (raw === undefined) return undefined
  const text = stripTemplates(raw).trim()
  if (text === '') return undefined
  const ap = /\{\{ap\|([^{}]*)\}\}/.exec(text)
  if (ap?.[1] !== undefined) {
    const parts = ap[1].split('|').map((part) => part.trim())
    const linear = /^([\d.]+)\s+to\s+([\d.]+)(?:\s+for\s+(\d+))?$/.exec(parts[0] ?? '')
    if (linear) {
      const from = Number(linear[1])
      const to = Number(linear[2])
      const count = linear[3] ? Number(linear[3]) : maxRank
      return Array.from({ length: count }, (_, index) =>
        round(from + ((to - from) * index) / Math.max(count - 1, 1)),
      )
    }
    const numbers = parts.map(Number)
    return numbers.every((number) => !Number.isNaN(number)) ? numbers : 'unparsed'
  }
  if (/\{\{pp\|/.test(text)) return 'formula'
  const first = /^-?[\d.]+/.exec(text.replace(/^[\s/]+/, ''))
  return first ? [Number(first[0])] : 'unparsed'
}

interface WikiAbility {
  fields: Record<string, string>
  text: string
}

function parseAbilityPage(wikitext: string): WikiAbility {
  const fields: Record<string, string> = {}
  for (const match of wikitext.matchAll(/^\|\s*([a-z0-9 ]+?)\s*=\s*([^\n]*)/gm)) {
    fields[(match[1] ?? '').trim()] = (match[2] ?? '').trim()
  }
  return { fields, text: wikitext }
}

/** Knock back comes before airborne: the wiki writes "{{tip|airborne|knocks back}}". */
const WIKI_CC_NAMES: ReadonlyArray<readonly [RegExp, CrowdControlKind]> = [
  [/stun/, 'stun'],
  [/root/, 'root'],
  [/knock ?back|knock ?away|knock ?aside|push/, 'knockback'],
  [/knock ?up|airborne/, 'knockup'],
  [/pull|drag/, 'pull'],
  [/silence/, 'silence'],
  [/fear|flee/, 'fear'],
  [/charm/, 'charm'],
  [/taunt/, 'taunt'],
  [/suppress/, 'suppression'],
  [/sleep|drowsy/, 'sleep'],
  [/polymorph/, 'polymorph'],
  [/blind/, 'blind'],
]

function kindOf(text: string): CrowdControlKind | undefined {
  const lower = text.toLowerCase()
  return WIKI_CC_NAMES.find(([pattern]) => pattern.test(lower))?.[1]
}

interface WikiCrowdControl {
  kind: CrowdControlKind
  seconds: RankValues | undefined
  source: 'wiki' | 'prose'
}

/**
 * Durations the wiki states. Structured lines like
 * {{st|Root Duration|{{ap|2 to 3}} seconds}} are trusted; "rooted for 1.5
 * seconds" in prose is a guess for a person to confirm.
 */
function crowdControlFromWiki(
  page: WikiAbility,
  maxRank: number,
  tooltipKinds: readonly CrowdControlKind[],
): WikiCrowdControl[] {
  const found: WikiCrowdControl[] = []
  const add = (kind: CrowdControlKind | undefined, raw: string, source: 'wiki' | 'prose') => {
    if (!kind || found.some((entry) => entry.kind === kind)) return
    const ranks = parseWikiRanks(raw, maxRank)
    found.push({ kind, seconds: Array.isArray(ranks) ? ranks : undefined, source })
  }
  // {{st|Root Duration|{{ap|2 to 3}} seconds}}, {{st|Stun Duration|{{fd|1.5}} seconds}}
  const structured =
    /\{\{st\|([^|{}]*?Duration)\|((?:\{\{ap\|[^{}]*\}\}|\{\{fd\|[\d.]+\}\}|[\d. ]+)[^}]*)\}\}/gi
  for (const match of page.text.matchAll(structured)) {
    const heading = match[1] ?? ''
    const named = kindOf(heading)
    // A bare "Duration" or "Disable Duration" line on an ability with one
    // kind of crowd control is that kind.
    const inferred =
      !named && /^(?:disable |cc )?duration$/i.test(heading.trim()) && tooltipKinds.length === 1
    add(named ?? (inferred ? tooltipKinds[0] : undefined), match[2] ?? '', named ? 'wiki' : 'prose')
  }
  // "{{tip|root|roots}} them for {{fd|1.5}} seconds", templates allowed in
  // between. Only crowd control tips may start a match, or a harmless tip
  // like "basic attack" swallows the sentence and the real one is skipped.
  const prose =
    /\{\{tip\|((?:stun|root|airborne|knock ?(?:up|back|away|aside)|pull|drag|silence|fear|flee|charm|taunt|suppress|sleep|drowsy|polymorph|blind)[^{}]*?)\}\}(?:[^.{}]|\{\{[^{}]*\}\}){0,120}?\bfor (\{\{ap\|[^{}]*\}\}|\{\{fd\|[\d.]+\}\}|[\d.]+) seconds?/gi
  for (const match of page.text.matchAll(prose)) add(kindOf(match[1] ?? ''), match[2] ?? '', 'prose')
  return found
}

const DISPLACEMENTS: readonly CrowdControlKind[] = ['knockup', 'knockback', 'pull']

/**
 * Every kind of crowd control the page names in a tip, with or without a
 * duration. The wiki calls every displacement "airborne", so one of them
 * counts for all three.
 */
function crowdControlMentioned(page: WikiAbility): Set<CrowdControlKind> {
  const mentioned = new Set<CrowdControlKind>()
  for (const match of page.text.matchAll(/\{\{tip\|([^{}]+?)\}\}/g)) {
    const text = (match[1] ?? '').toLowerCase()
    if (/knock ?down/.test(text)) continue
    const kind = kindOf(text)
    if (!kind) continue
    if (DISPLACEMENTS.includes(kind)) for (const each of DISPLACEMENTS) mentioned.add(each)
    else mentioned.add(kind)
  }
  return mentioned
}

/** Displacements have no duration worth a number; the other kinds do. */
const TIMED_KINDS = new Set<CrowdControlKind>([
  'stun',
  'root',
  'silence',
  'fear',
  'charm',
  'taunt',
  'suppression',
  'sleep',
  'polymorph',
  'blind',
])

// ---- comparison ----

interface Flag {
  champ: string
  slot: AbilitySlot
  ability: string
  field: string
  dataDragon: string
  wiki: string
  why: string
}

const same = (a: RankValues, b: RankValues): boolean => {
  const widen = (values: RankValues, length: number) =>
    values.length === 1 ? Array.from({ length }, () => values[0] ?? 0) : values
  const length = Math.max(a.length, b.length)
  const left = widen(a, length)
  const right = widen(b, length)
  return left.length === right.length && left.every((value, i) => Math.abs(value - (right[i] ?? 0)) < 0.011)
}

const show = (value: WikiValue): string =>
  value === undefined ? 'nothing' : Array.isArray(value) ? formatRanks(value) : value

/** Compares the numbers the app would show (overrides applied) with the wiki. */
function checkNumbers(champion: ChampionAbilities, ability: DisplayAbility, page: WikiAbility | undefined): Flag[] {
  const flags: Flag[] = []
  const flag = (field: string, dataDragon: string, wiki: string, why: string) =>
    flags.push({ champ: champion.id, slot: ability.slot, ability: ability.name, field, dataDragon, wiki, why })

  const zeroCooldown = ability.cooldown.every((value) => value === 0)
  if (!KNOWN_COST_UNITS.has(ability.costUnit)) {
    flag('cost', `${formatRanks(ability.cost)} ${ability.costUnit}`, '', 'unusual cost unit')
  }
  if (!page) {
    if (zeroCooldown && !ability.isCooldownHidden) flag('cooldown', '0', 'no page', 'no cooldown in Data Dragon')
    return flags
  }

  const wikiCooldown = parseWikiRanks(page.fields.cooldown ?? page.fields.recharge, ability.maxRank)
  if (ability.isCooldownHidden) {
    // Hidden on purpose; nothing to compare.
  } else if (wikiCooldown === undefined && !zeroCooldown) {
    flag('cooldown', formatRanks(ability.cooldown), 'nothing', 'wiki lists no cooldown: hidden or meaningless?')
  } else if (wikiCooldown === 'formula' && ability.scaling === undefined) {
    flag('cooldown', formatRanks(ability.cooldown), 'formula', 'scales with a stat or level: needs a mark')
  } else if (wikiCooldown === 'unparsed') {
    flag('cooldown', formatRanks(ability.cooldown), page.fields.cooldown ?? '', 'wiki format not understood')
  } else if (Array.isArray(wikiCooldown) && !same(ability.cooldown, wikiCooldown)) {
    flag('cooldown', formatRanks(ability.cooldown), formatRanks(wikiCooldown), 'disagree')
  }

  const wikiCost = parseWikiRanks(page.fields.cost, ability.maxRank)
  if (Array.isArray(wikiCost) && !same(ability.cost, wikiCost)) {
    flag('cost', formatRanks(ability.cost), formatRanks(wikiCost), 'disagree')
  } else if (wikiCost === undefined && ability.costUnit !== '' && page.fields.costtype) {
    flag('cost', formatRanks(ability.cost), page.fields.costtype, 'wiki cost not understood')
  }

  const wikiRange = parseWikiRanks(page.fields.range ?? page.fields['target range'], ability.maxRank)
  const placeholder = ability.range.some((value) => value >= GLOBAL_RANGE)
  if (placeholder && Array.isArray(wikiRange)) {
    flag('range', 'global', formatRanks(wikiRange), 'placeholder in Data Dragon')
  } else if (Array.isArray(wikiRange) && !same(ability.range, wikiRange)) {
    const gap = Math.abs((ability.range[0] ?? 0) - Math.abs(wikiRange[0] ?? 0))
    if (gap > RANGE_TOLERANCE) flag('range', formatRanks(ability.range), show(wikiRange), 'disagree')
  }
  return flags
}

interface CrowdControlFinding {
  champ: string
  slot: AbilitySlot
  ability: string
  kind: CrowdControlKind
  /** The Data Dragon tooltip names this kind. */
  tooltip: boolean
  /** The wiki page names this kind somewhere, duration or not. */
  mentioned: boolean
  wiki: WikiCrowdControl | undefined
}

function checkCrowdControl(champion: ChampionAbilities, ability: Ability, page: WikiAbility | undefined): CrowdControlFinding[] {
  const fromWiki = page ? crowdControlFromWiki(page, ability.maxRank, ability.crowdControl) : []
  const mentioned = page ? crowdControlMentioned(page) : new Set<CrowdControlKind>()
  const kinds = new Set<CrowdControlKind>([...ability.crowdControl, ...fromWiki.map((entry) => entry.kind)])
  return CROWD_CONTROL_KINDS.filter((kind) => kinds.has(kind)).map((kind) => ({
    champ: champion.id,
    slot: ability.slot,
    ability: ability.name,
    kind,
    tooltip: ability.crowdControl.includes(kind),
    mentioned: mentioned.has(kind) || fromWiki.some((entry) => entry.kind === kind),
    wiki: fromWiki.find((entry) => entry.kind === kind),
  }))
}

/**
 * What a person should look at. A displacement the wiki also names needs no
 * number; a timed kind without one does; a kind the wiki never mentions may
 * be a false match in the tooltip.
 */
function reviewReason(finding: CrowdControlFinding): string | undefined {
  if (!finding.tooltip) return 'wiki names it, the tooltip did not: add an override or ignore'
  if (!finding.mentioned) return 'tooltip names it, the wiki page does not: real or a false match?'
  if (!finding.wiki?.seconds) {
    return TIMED_KINDS.has(finding.kind) ? 'duration not found: type it by hand' : undefined
  }
  return finding.wiki.source === 'prose' ? 'duration guessed from prose: confirm' : undefined
}

// ---- outputs ----

/** Today as yyyy-mm-dd in local time, for the document header. */
function localDate(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function markdownTable(headers: string[], rows: string[][]): string {
  const escape = (cell: string) => cell.replace(/\|/g, '\\|')
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n')
}

async function main(): Promise<void> {
  const snapshot = loadBundledAbilities()
  const patch = displayPatchFromDataDragon(snapshot.version)
  const curation = loadBundledCuration()
  const existing = curation.crowdControl
  const lua = await fetchWiki('Module:ChampionData/data')
  if (!lua) throw new Error('Could not read the wiki champion module.')
  const wiki = parseChampionModule(lua)

  const champions = snapshot.champions.filter((champion) => !onlyChamps || onlyChamps.has(champion.id))
  const numberFlags: Flag[] = []
  const ccFindings: CrowdControlFinding[] = []
  const missingPages: string[] = []

  for (const champion of champions) {
    const entry = wiki.get(champion.id)
    for (const ability of displayAbilities(champion, curation)) {
      const skill = entry?.skills[ability.slot]
      const raw = entry && skill ? await fetchWiki(`Template:Data ${entry.wikiName}/${skill}`) : undefined
      if (!raw) missingPages.push(`${champion.id} ${ability.slot}`)
      const page = raw ? parseAbilityPage(raw) : undefined
      numberFlags.push(...checkNumbers(champion, ability, page))
      ccFindings.push(...checkCrowdControl(champion, ability, page))
    }
    process.stdout.write('.')
  }
  process.stdout.write('\n')

  // Crowd control file: keep verified and hand rows, redraft the rest from the wiki.
  const kept = existing.filter(
    (row) =>
      (row.verified || row.source === 'hand') &&
      (!onlyChamps || !onlyChamps.has(row.champ)),
  )
  const keptKeys = new Set(kept.map((row) => `${curationKey(row.champ, row.slot)}:${row.kind}`))
  const drafted: CrowdControlEntry[] = []
  for (const finding of ccFindings) {
    const key = `${curationKey(finding.champ, finding.slot)}:${finding.kind}`
    const previous = existing.find(
      (row) => row.champ === finding.champ && row.slot === finding.slot && row.kind === finding.kind,
    )
    if (previous && (previous.verified || previous.source === 'hand')) {
      if (!keptKeys.has(key)) kept.push(previous)
      continue
    }
    if (finding.wiki?.seconds) {
      drafted.push({
        champ: finding.champ,
        slot: finding.slot,
        kind: finding.kind,
        seconds: finding.wiki.seconds,
        source: finding.wiki.source,
        verified: false,
        checkedPatch: patch,
      })
    }
  }
  const untouched = onlyChamps ? existing.filter((row) => !onlyChamps.has(row.champ) && !kept.includes(row)) : []
  const crowdControl = CrowdControlEntries.parse(
    [...kept, ...untouched, ...drafted].sort(
      (a, b) => a.champ.localeCompare(b.champ) || a.slot.localeCompare(b.slot) || a.kind.localeCompare(b.kind),
    ),
  )
  writeFileSync(CROWD_CONTROL_PATH, `${JSON.stringify(crowdControl, null, 2)}\n`)

  // Review document.
  const ccToReview = ccFindings.filter((finding) => reviewReason(finding) !== undefined)
  const ccWhy = (finding: CrowdControlFinding): string => reviewReason(finding) ?? ''
  const lines = [
    '# Ability review',
    '',
    `Generated by \`npm run check-abilities\` on ${localDate()} for Data Dragon ${snapshot.version} (patch ${patch}).`,
    'Data Dragon is what the app shows. The wiki is only a second opinion. Tick a line once you looked at it; fix it in',
    '`src/data/curated/overrides.json` (numbers, marks) or `src/data/curated/crowdControl.json` (durations, set `verified`).',
    '',
    '## Summary',
    '',
    `- ${champions.length} champions, ${champions.length * ABILITY_SLOTS.length} abilities checked`,
    `- ${numberFlags.length} number flags, ${ccToReview.length} crowd control lines to confirm, ${drafted.length} durations drafted`,
    `- ${missingPages.length} abilities without a wiki page (${missingPages.slice(0, 12).join(', ')}${missingPages.length > 12 ? ', …' : ''})`,
    '',
    '## Numbers to check',
    '',
    markdownTable(
      ['Done', 'Champion', 'Ability', 'Field', 'Data Dragon', 'Wiki', 'Why'],
      numberFlags.map((flag) => ['[ ]', flag.champ, `${flag.slot} ${flag.ability}`, flag.field, flag.dataDragon, flag.wiki, flag.why]),
    ),
    '',
    '## Crowd control to confirm',
    '',
    markdownTable(
      ['Done', 'Champion', 'Ability', 'Kind', 'Tooltip', 'Wiki', 'Why'],
      ccToReview.map((finding) => [
        '[ ]',
        finding.champ,
        `${finding.slot} ${finding.ability}`,
        finding.kind,
        finding.tooltip ? 'yes' : 'no',
        finding.wiki ? `${finding.wiki.seconds ? formatRanks(finding.wiki.seconds) : '?'} (${finding.wiki.source})` : 'no',
        ccWhy(finding),
      ]),
    ),
    '',
  ]
  writeFileSync(REVIEW_PATH, lines.join('\n'))
  console.log(`${numberFlags.length} number flags, ${ccToReview.length} crowd control lines to confirm, ${drafted.length} durations drafted`)
  console.log(`wrote ${REVIEW_PATH}`)
  console.log(`wrote ${CROWD_CONTROL_PATH}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
