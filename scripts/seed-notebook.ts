/**
 * Dev helper: merges sample tips and favorites into the real notebook file so
 * the UI has something to show. Safe to run more than once: items are merged
 * by id, and anything you added yourself is kept.
 *
 *   npm run seed
 *
 * Reads settings.json for a custom notebook folder, otherwise uses the
 * default Roaming app folder. Windows only, like the app for now.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  Notebook,
  SCHEMA_VERSION,
  type Profile,
  type Review,
  type RunePage,
  type SkillOrder,
  type Tip,
} from '../src/schema/index.ts'
import bundledRunes from '../src/data/bundled/runes.json' with { type: 'json' }

const APP_IDENTIFIER = 'com.jesse.matchupnotebook'
const SEED_AUTHOR = {
  authorId: '5eed0000-0000-4000-8000-000000000001',
  authorName: 'Coach Midland',
}
const CURRENT_PATCH = '26.20'

function appDataDirectory(): string {
  const roaming = process.env['APPDATA']
  if (!roaming) throw new Error('APPDATA is not set. This script expects Windows.')
  return join(roaming, APP_IDENTIFIER)
}

function notebookDirectory(): string {
  const defaultDirectory = appDataDirectory()
  const settingsPath = join(defaultDirectory, 'settings.json')
  if (existsSync(settingsPath)) {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
      notebookDirectory?: string
    }
    if (settings.notebookDirectory) return settings.notebookDirectory
  }
  return defaultDirectory
}

function seedId(n: number): string {
  return `5eed0000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

interface SeedTip {
  scope: Tip['scope']
  kind: Tip['kind']
  text: string
  patch?: string
  imported?: boolean
  daysAgo?: number
  /** Index into SEED_REFLECTIONS this tip came out of. */
  review?: number
}

interface SeedReview {
  scope: Review['scope']
  text: string
  daysAgo: number
}

const SEED_REFLECTIONS: SeedReview[] = [
  {
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' },
    text: 'Lost lane hard. Kept throwing Q into Wind Wall and he froze near his tower so I could not roam. Won late because bot was ahead, not because of me. Next time: hold Q until the wall is down, and shove at 3:00 instead of trading.',
    daysAgo: 3,
  },
  {
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' },
    text: "Much better. Doran's Shield made the first three levels fine. Got first blood with the W into my own Worked Ground at level 2. Still lost a trade at 6 because I forgot his R follows the knock-up.",
    daysAgo: 12,
  },
  {
    scope: { myChamp: 'Ahri', enemy: 'Taliyah' },
    text: 'Her W-E combo is instant, I kept getting hit while walking up for charm. Fine once I started waiting for her E to be on the ground before stepping in.',
    daysAgo: 9,
  },
]

const SEED_TIPS: SeedTip[] = [
  // Taliyah in general
  {
    scope: { myChamp: 'Taliyah' },
    kind: 'general',
    text: 'Worked Ground under yourself before every trade. Most dashes die on it.',
  },
  {
    scope: { myChamp: 'Taliyah' },
    kind: 'win_con',
    text: "You win by roaming, not by killing your laner. Shove, then Weaver's Wall a flank for the jungler.",
    daysAgo: 20,
  },
  {
    scope: { myChamp: 'Taliyah' },
    kind: 'setup',
    text: 'Start Q, max Q, take W second. E second only into heavy dash matchups.',
    patch: '26.12',
    daysAgo: 60,
  },
  // Taliyah vs Yasuo
  {
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
    kind: 'early',
    text: 'Hold W until he uses his third Q. Then knock him back into your own Worked Ground.',
  },
  {
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
    kind: 'watch_out',
    text: 'His Wind Wall eats the whole Q volley. Throw Q only after he wastes it on a minion wave poke.',
    daysAgo: 3,
    review: 0,
  },
  {
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' },
    kind: 'setup',
    text: "Mid only: take Doran's Shield and second wind. He pokes with Q through minions all lane.",
    daysAgo: 12,
    review: 1,
  },
  {
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
    kind: 'general',
    text: 'Imported example: Never fight him in a minion wave after level 2. Freeze near your tower instead.',
    imported: true,
    daysAgo: 12,
  },
  // Taliyah vs others
  {
    scope: { myChamp: 'Taliyah', enemy: 'Zed' },
    kind: 'watch_out',
    text: 'When he hits 6, stand on Worked Ground. His R dash is stopped by the E field too.',
    daysAgo: 30,
  },
  {
    scope: { myChamp: 'Taliyah', enemy: 'Leblanc' },
    kind: 'early',
    text: 'Her W lands on a fixed spot. Pre-place E where she will jump, then W her back out.',
    patch: '25.20',
    daysAgo: 200,
  },
  {
    scope: { myChamp: 'Taliyah', enemy: 'Ahri' },
    kind: 'general',
    text: 'Save W for her R. She has no escape between dashes, so one knock-up wins the fight.',
    daysAgo: 15,
  },
  // Against Yasuo, any champ
  {
    scope: { enemy: 'Yasuo' },
    kind: 'general',
    text: 'Count his Qs. Two stacks means the third one knocks you up. Back off at two.',
    daysAgo: 40,
  },
  {
    scope: { enemy: 'Yasuo', role: 'top' },
    kind: 'general',
    text: 'Top lane Yasuo takes Fleet. He out-sustains short trades, so commit to long ones or none.',
    daysAgo: 45,
  },
  // Other champs for the favorites row
  {
    scope: { myChamp: 'Ahri' },
    kind: 'general',
    text: 'Charm into Q. Never Q into charm. The Q damage is what kills.',
    daysAgo: 5,
  },
  {
    scope: { myChamp: 'Ahri', enemy: 'Taliyah' },
    kind: 'watch_out',
    text: 'Her W-E combo comes out instantly. Keep R stacks for after she has used E.',
    daysAgo: 9,
    review: 2,
  },
  {
    scope: { myChamp: 'Nami', enemy: 'Thresh', role: 'support' },
    kind: 'early',
    text: 'Stand behind the caster minions. His hook has to travel through them. Bubble him when he walks up for a lantern play.',
    daysAgo: 2,
  },
  {
    scope: { myChamp: 'LeeSin' },
    kind: 'win_con',
    text: 'Level 3 gank mid. Say it in chat at 2:45 so your mid shoves.',
    daysAgo: 1,
  },
  {
    scope: { role: 'jungle' },
    kind: 'general',
    text: 'Any jungler: ward the enemy raptors at 3:15. It tells you their whole first clear.',
    daysAgo: 7,
  },
]

/** Rune ids by Data Dragon key, so the seed fails loudly if a name is wrong. */
function perkId(key: string): number {
  for (const style of bundledRunes.styles) {
    for (const row of style.slots) {
      const perk = row.find((candidate) => candidate.key === key)
      if (perk) return perk.id
    }
  }
  throw new Error(`No rune with key ${key}`)
}

interface SeedRunePage {
  scope: RunePage['scope']
  name: string
  primaryStyleId: number
  subStyleId: number
  perks: [string, string, string, string, string, string]
  shards: [number, number, number]
  /** Replaces one perk with an id that no longer exists, to show the needs-update state. */
  breakSlot?: number
}

const SEED_RUNE_PAGES: SeedRunePage[] = [
  {
    scope: { myChamp: 'Taliyah' },
    name: 'Taliyah default',
    primaryStyleId: 8200,
    subStyleId: 8400,
    perks: ['ArcaneComet', 'ManaflowBand', 'Transcendence', 'Scorch', 'SecondWind', 'Overgrowth'],
    shards: [5008, 5010, 5001],
  },
  {
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
    name: 'Taliyah vs Yasuo',
    primaryStyleId: 8200,
    subStyleId: 8300,
    perks: [
      'SummonAery',
      'NimbusCloak',
      'Transcendence',
      'GatheringStorm',
      'BiscuitDelivery',
      'CosmicInsight',
    ],
    shards: [5008, 5010, 5011],
    breakSlot: 2,
  },
]

function seedRunePage(seed: SeedRunePage, index: number, profile: Profile): RunePage {
  const at = daysAgo(30)
  const selectedPerkIds = [...seed.perks.map(perkId), ...seed.shards]
  if (seed.breakSlot !== undefined) selectedPerkIds[seed.breakSlot] = 8999
  return {
    id: seedId(200 + index + 1),
    scope: seed.scope,
    name: seed.name,
    primaryStyleId: seed.primaryStyleId,
    subStyleId: seed.subStyleId,
    selectedPerkIds,
    patch: CURRENT_PATCH,
    origin: { type: 'mine', authorId: profile.authorId, authorName: profile.authorName },
    visibility: 'private',
    createdAt: at,
    updatedAt: at,
  }
}

interface SeedSkillOrder {
  scope: SkillOrder['scope']
  name: string
  levels: string
}

/** Levels as one string, e.g. 'QWEQQRQWQWRWWEERE E' without the spaces. */
const SEED_SKILL_ORDERS: SeedSkillOrder[] = [
  { scope: { myChamp: 'Taliyah' }, name: 'Standard', levels: 'QWEQQRQWQWRWWEEREE' },
  {
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
    name: 'W second vs dashes',
    levels: 'QWEQQRQWQWRWWEEREE',
  },
  { scope: { myChamp: 'Ahri' }, name: 'Standard', levels: 'QWEQQRQWQWRWWEEREE' },
]

function seedSkillOrder(seed: SeedSkillOrder, index: number, profile: Profile): SkillOrder {
  const at = daysAgo(20)
  return {
    id: seedId(300 + index + 1),
    scope: seed.scope,
    name: seed.name,
    levels: seed.levels.split('') as SkillOrder['levels'],
    patch: CURRENT_PATCH,
    origin: { type: 'mine', authorId: profile.authorId, authorName: profile.authorName },
    visibility: 'private',
    createdAt: at,
    updatedAt: at,
  }
}

const SEED_FAVORITES = ['Taliyah', 'Ahri', 'Nami', 'LeeSin']

function reviewId(index: number): string {
  return seedId(100 + index + 1)
}

function seedReview(seed: SeedReview, index: number, profile: Profile): Review {
  const at = daysAgo(seed.daysAgo)
  return {
    id: reviewId(index),
    scope: seed.scope,
    text: seed.text,
    patch: CURRENT_PATCH,
    origin: { type: 'mine', authorId: profile.authorId, authorName: profile.authorName },
    visibility: 'private',
    createdAt: at,
    updatedAt: at,
  }
}

function seedTip(seed: SeedTip, index: number, profile: Profile): Tip {
  const at = daysAgo(seed.daysAgo ?? 0)
  return {
    ...(seed.review !== undefined && { reviewId: reviewId(seed.review) }),
    id: seedId(index + 1),
    scope: seed.scope,
    kind: seed.kind,
    text: seed.text,
    patch: seed.patch ?? CURRENT_PATCH,
    origin: seed.imported
      ? { type: 'imported', ...SEED_AUTHOR, packId: seedId(999) }
      : { type: 'mine', authorId: profile.authorId, authorName: profile.authorName },
    visibility: 'private',
    createdAt: at,
    updatedAt: at,
  }
}

function main(): void {
  const directory = notebookDirectory()
  const path = join(directory, 'notebook.json')
  const profile: Profile = { authorId: crypto.randomUUID(), authorName: '' }

  const existing = existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8'))
    : {
        schemaVersion: SCHEMA_VERSION,
        profile,
        favoriteChamps: [],
        tips: [],
        runePages: [],
        reviews: [],
      }
  if (existing.schemaVersion === 1) {
    existing.favoriteChamps = []
    existing.schemaVersion = 2
  }
  if (existing.schemaVersion === 2) {
    existing.reviews = existing.reflections ?? []
    delete existing.reflections
    existing.tips = existing.tips.map((tip: Record<string, unknown>) => {
      const { reflectionId, ...rest } = tip
      return reflectionId === undefined ? rest : { ...rest, reviewId: reflectionId }
    })
    existing.schemaVersion = 3
  }
  if (existing.schemaVersion === 3) {
    existing.skillOrders = []
    existing.schemaVersion = 4
  }

  const tips = SEED_TIPS.map((seed, index) => seedTip(seed, index, existing.profile))
  // Seed-owned tips (our fixed ids) are refreshed in place; your own tips are never touched.
  const seedIds = new Set(tips.map((tip) => tip.id))
  const kept = existing.tips.filter((tip: Tip) => !seedIds.has(tip.id))
  const added = tips.length - (existing.tips.length - kept.length)
  existing.tips = [...kept, ...tips]

  const reviews = SEED_REFLECTIONS.map((seed, index) => seedReview(seed, index, existing.profile))
  const existingReviewIds = new Set<string>(existing.reviews.map((review: Review) => review.id))
  const addedReviews = reviews.filter((r) => !existingReviewIds.has(r.id))
  existing.reviews.push(...addedReviews)

  const runePages = SEED_RUNE_PAGES.map((seed, index) =>
    seedRunePage(seed, index, existing.profile),
  )
  const seedPageIds = new Set(runePages.map((page) => page.id))
  existing.runePages = [
    ...existing.runePages.filter((page: RunePage) => !seedPageIds.has(page.id)),
    ...runePages,
  ]

  const skillOrders = SEED_SKILL_ORDERS.map((seed, index) =>
    seedSkillOrder(seed, index, existing.profile),
  )
  const seedOrderIds = new Set(skillOrders.map((order) => order.id))
  existing.skillOrders = [
    ...existing.skillOrders.filter((order: SkillOrder) => !seedOrderIds.has(order.id)),
    ...skillOrders,
  ]

  const favorites = new Set<string>(existing.favoriteChamps)
  for (const champ of SEED_FAVORITES) favorites.add(champ)
  existing.favoriteChamps = [...favorites]

  const result = Notebook.safeParse(existing)
  if (!result.success) {
    console.error('Seed produced an invalid notebook, nothing written:\n', result.error.message)
    process.exit(1)
  }

  mkdirSync(directory, { recursive: true })
  writeFileSync(path, `${JSON.stringify(result.data, null, 2)}\n`)
  console.log(
    `Wrote ${path}: ${added} tips and ${addedReviews.length} reviews added, ${result.data.tips.length} tips total, favorites ${result.data.favoriteChamps.join(', ')}`,
  )
}

main()
