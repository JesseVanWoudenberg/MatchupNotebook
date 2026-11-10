import { z } from 'zod'
import { ChampId } from '@/schema'
import bundledSnapshot from './bundled/abilities.json'

/**
 * The opponent's ability numbers, as Data Dragon publishes them: base values
 * only, no haste, items or runes. Shown on the live view and the matchup
 * page's numbers tab. Riot allows static data like this; nothing here ever
 * reacts to a running game.
 */

export const AbilitySlot = z.enum(['Q', 'W', 'E', 'R'])
export type AbilitySlot = z.infer<typeof AbilitySlot>
export const ABILITY_SLOTS = AbilitySlot.options

/** Hard crowd control only. Slows are everywhere and not worth a mark. */
export const CrowdControlKind = z.enum([
  'stun',
  'root',
  'knockup',
  'knockback',
  'pull',
  'silence',
  'fear',
  'charm',
  'taunt',
  'suppression',
  'sleep',
  'polymorph',
  'blind',
])
export type CrowdControlKind = z.infer<typeof CrowdControlKind>
export const CROWD_CONTROL_KINDS = CrowdControlKind.options

/** One number per rank, or a single number when every rank is the same. */
export const RankValues = z.array(z.number().nonnegative()).min(1)
export type RankValues = z.infer<typeof RankValues>

export const Ability = z.strictObject({
  slot: AbilitySlot,
  name: z.string().min(1),
  /** Data Dragon's icon file name, like "LeblancW.png". */
  icon: z.string().min(1),
  maxRank: z.int().positive(),
  /** Seconds. All zero when Data Dragon has no cooldown for it. */
  cooldown: RankValues,
  cost: RankValues,
  /** "mana", "energy", "% of current health"… Empty when the ability costs nothing. */
  costUnit: z.string(),
  /** Units. 0 means self or no target; 20000 and up means global in Data Dragon's data. */
  range: RankValues,
  /** 0 when the ability has no charges. */
  charges: z.int().nonnegative(),
  /** Read from the tooltip's status markup. Kinds only, never durations. */
  crowdControl: z.array(CrowdControlKind),
})
export type Ability = z.infer<typeof Ability>

export const ChampionAbilities = z.strictObject({
  id: ChampId,
  attackRange: z.number().nonnegative(),
  /** Riot's resource name: "Mana", "Energy", "None", "Fury"… */
  resource: z.string(),
  abilities: z.array(Ability).length(ABILITY_SLOTS.length),
})
export type ChampionAbilities = z.infer<typeof ChampionAbilities>

/** Every champion's abilities, tied to the Data Dragon version they came from. */
export const AbilitySnapshot = z.strictObject({
  version: z.string().min(1),
  champions: z.array(ChampionAbilities).min(1),
})
export type AbilitySnapshot = z.infer<typeof AbilitySnapshot>

/** The snapshot shipped inside the app. Validated like any other input. */
export function loadBundledAbilities(): AbilitySnapshot {
  return AbilitySnapshot.parse(bundledSnapshot)
}

// ---- Data Dragon's championFull.json ----

const ChampionFullSpell = z.object({
  name: z.string(),
  tooltip: z.string().default(''),
  maxrank: z.number(),
  cooldownBurn: z.string(),
  costBurn: z.string(),
  costType: z.string(),
  rangeBurn: z.string(),
  maxammo: z.string(),
  image: z.object({ full: z.string() }),
})

const ChampionFullResponse = z.object({
  version: z.string().min(1),
  data: z.record(
    z.string(),
    z.object({
      id: z.string(),
      partype: z.string(),
      stats: z.object({ attackrange: z.number() }),
      spells: z.array(ChampionFullSpell),
    }),
  ),
})

const RESOURCE_PLACEHOLDER = '{{ abilityresourcename }}'
const NO_COST = 'no cost'
const PLACEHOLDER = /\{\{[^}]*\}\}/g

/** "16/14/12/10/8/6" to numbers; "6" stays one number. Junk becomes 0, never NaN. */
export function parseBurn(burn: string): RankValues {
  const values = burn.split('/').map((part) => {
    const value = Number(part.trim())
    return Number.isFinite(value) && value >= 0 ? value : 0
  })
  return values.every((value) => value === values[0]) ? [values[0] ?? 0] : values
}

/**
 * Data Dragon's cost type into a unit the UI can print after the number.
 * Most spells say "{{ abilityresourcename }}", which means the champion's own
 * resource. Anything that costs nothing gets an empty unit.
 */
export function costUnitOf(costType: string, resource: string, cost: RankValues): string {
  if (cost.every((value) => value === 0)) return ''
  const unit = costType
    .replace(RESOURCE_PLACEHOLDER, resource)
    .replace(PLACEHOLDER, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  return unit === NO_COST ? '' : unit
}

/** Status words Riot wraps in <status> tags, to a kind. First match per kind wins. */
const STATUS_KINDS: ReadonlyArray<readonly [CrowdControlKind, RegExp]> = [
  ['stun', /\bstun/],
  ['root', /\broot/],
  ['pull', /\b(?:pull|drag)/],
  ['silence', /\bsilenc/],
  ['fear', /\b(?:fear|flee|terrif)/],
  ['charm', /\bcharm/],
  ['taunt', /\btaunt/],
  ['suppression', /\bsuppress/],
  ['sleep', /\b(?:asleep|sleep|drowsy)/],
  ['polymorph', /\bpolymorph/],
  ['blind', /\bblind/],
]
/** "Knocking them Up" is split over two tags, so these run on the plain text. */
const KNOCKUP = /\b(?:knock(?:s|ed|ing)?(?: \w+){0,2} up|airborne)\b/
const KNOCKBACK = /\b(?:knock(?:s|ed|ing)?(?: \w+){0,2} (?:back|away|aside)|push(?:es|ed|ing)?)\b/
const STATUS_TAG = /<status>(.*?)<\/status>/g
const ANY_TAG = /<[^>]+>/g

/** The hard crowd control a tooltip names, in a fixed order. */
export function crowdControlFromTooltip(tooltip: string): CrowdControlKind[] {
  const statuses = [...tooltip.matchAll(STATUS_TAG)].map((match) => match[1] ?? '')
  const statusText = statuses.join(' ').toLowerCase()
  const plainText = tooltip.replace(ANY_TAG, ' ').replace(/\s+/g, ' ').toLowerCase()
  const found = new Set<CrowdControlKind>()
  for (const [kind, pattern] of STATUS_KINDS) if (pattern.test(statusText)) found.add(kind)
  if (statuses.length > 0 && KNOCKUP.test(plainText)) found.add('knockup')
  if (statuses.length > 0 && KNOCKBACK.test(plainText)) found.add('knockback')
  return CROWD_CONTROL_KINDS.filter((kind) => found.has(kind))
}

/** Data Dragon's championFull.json into our snapshot. Throws on an unexpected response. */
export function parseChampionFull(json: string): AbilitySnapshot {
  const response = ChampionFullResponse.parse(JSON.parse(json))
  const champions = Object.values(response.data)
    .map((entry) =>
      ChampionAbilities.parse({
        id: entry.id,
        attackRange: entry.stats.attackrange,
        resource: entry.partype,
        abilities: entry.spells.slice(0, ABILITY_SLOTS.length).map((spell, index) => {
          const cost = parseBurn(spell.costBurn)
          const charges = Number(spell.maxammo)
          return {
            slot: ABILITY_SLOTS[index],
            name: spell.name,
            icon: spell.image.full,
            maxRank: spell.maxrank,
            cooldown: parseBurn(spell.cooldownBurn),
            cost,
            costUnit: costUnitOf(spell.costType, entry.partype, cost),
            range: parseBurn(spell.rangeBurn),
            charges: Number.isFinite(charges) && charges > 0 ? charges : 0,
            crowdControl: crowdControlFromTooltip(spell.tooltip),
          }
        }),
      }),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
  return AbilitySnapshot.parse({ version: response.version, champions })
}
