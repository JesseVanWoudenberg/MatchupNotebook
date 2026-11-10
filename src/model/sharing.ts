import type { ChampId, Notebook, Origin, Profile, Review, Uuid } from '@/schema'
import type { Env } from './factories'
import type { ChampionNamer } from './labels'
import { tipsForScope, type ScopeFilter } from './matchup'
import { runePagesForView } from './runePages'
import { skillOrdersForView } from './skillOrders'

/**
 * Export and import. The file is the storage format (D-007). A backup is
 * the whole notebook; a share is a slice of it without reviews or
 * favorites. Import always merges by id (D-039, D-040).
 */

export interface ShareOptions {
  /** One champ or one matchup. Undefined shares every tip. */
  view?: ScopeFilter
  includeRunePages: boolean
  includeSkillOrders: boolean
}

/** The whole notebook, as is. Reviews, favorites and your profile included. */
export function backupDocument(notebook: Notebook): Notebook {
  return clone(notebook)
}

/**
 * A slice for someone else: the tips that fit the view, optionally the rune
 * pages and skill orders that fit it, no reviews, no favorites. Your items
 * carry your current name so the other side can show who wrote them.
 */
export function shareDocument(notebook: Notebook, options: ShareOptions): Notebook {
  const view = options.view
  const fit = { includeNarrower: true }
  const stamp = <T extends { origin: Origin }>(item: T): T =>
    withCurrentName(item, notebook.profile)
  return {
    schemaVersion: notebook.schemaVersion,
    profile: { ...notebook.profile },
    favoriteChamps: [],
    tips: (view ? tipsForScope(notebook.tips, view, fit) : [...notebook.tips]).map(stamp),
    runePages: options.includeRunePages
      ? (view ? runePagesForView(notebook.runePages, view, fit) : [...notebook.runePages]).map(
          stamp,
        )
      : [],
    skillOrders: options.includeSkillOrders
      ? (view
          ? skillOrdersForView(notebook.skillOrders, view, fit)
          : [...notebook.skillOrders]
        ).map(stamp)
      : [],
    reviews: [],
  }
}

function withCurrentName<T extends { origin: Origin }>(item: T, profile: Profile): T {
  if (item.origin.authorId !== profile.authorId) return clone(item)
  return clone({ ...item, origin: { ...item.origin, authorName: profile.authorName } })
}

const FILE_EXTENSION = '.json'

/** "taliyah-vs-yasuo-mid.json", "taliyah.json" or "matchup-notebook-share.json". */
export function shareFileName(view: ScopeFilter | undefined, nameOf: ChampionNamer): string {
  if (!view?.myChamp) return `matchup-notebook-share${FILE_EXTENSION}`
  const parts = [nameOf(view.myChamp)]
  if (view.enemy) parts.push('vs', nameOf(view.enemy))
  if (view.role) parts.push(view.role)
  return `${parts.map(slug).join('-')}${FILE_EXTENSION}`
}

/** "matchup-notebook-backup-2026-10-14.json". */
export function backupFileName(now: string): string {
  return `matchup-notebook-backup-${now.slice(0, 10)}${FILE_EXTENSION}`
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export interface ImportCounts {
  added: number
  updated: number
  skipped: number
}

export interface ImportPlan {
  /** Stamped on imported items that have no pack yet. */
  packId: Uuid
  /** The file's author, by name. Empty when they never set one. */
  authorName: string
  /** True when the file was written by this profile: a backup coming home. */
  isOwnBackup: boolean
  tips: ImportCounts
  runePages: ImportCounts
  skillOrders: ImportCounts
  reviews: ImportCounts
  favoriteChamps: number
  /** The merged notebook, ready to keep. */
  result: Notebook
}

interface Item {
  id: Uuid
  origin: Origin
  updatedAt: string
}

/**
 * Merge by id. New ids are added. An id you already own is left alone.
 * An imported id is replaced only by a newer copy. Items by someone else
 * become "imported" with a pack id; your own (from a backup) stay yours.
 * Reviews and favorites come along only from your own backup (D-040).
 */
export function planImport(current: Notebook, incoming: Notebook, env: Env): ImportPlan {
  const packId = env.newId()
  const profile = current.profile
  const isOwnBackup = incoming.profile.authorId === profile.authorId
  const merge = <T extends Item>(mine: readonly T[], theirs: readonly T[], allowForeign: boolean) =>
    mergeItems(mine, theirs, profile, packId, allowForeign)

  const tips = merge(current.tips, incoming.tips, true)
  const runePages = merge(current.runePages, incoming.runePages, true)
  const skillOrders = merge(current.skillOrders, incoming.skillOrders, true)
  const reviews = merge<Review>(current.reviews, incoming.reviews, false)
  const favoriteChamps = isOwnBackup
    ? mergeFavorites(current.favoriteChamps, incoming.favoriteChamps)
    : [...current.favoriteChamps]

  return {
    packId,
    authorName: incoming.profile.authorName,
    isOwnBackup,
    tips: tips.counts,
    runePages: runePages.counts,
    skillOrders: skillOrders.counts,
    reviews: reviews.counts,
    favoriteChamps: favoriteChamps.length - current.favoriteChamps.length,
    result: {
      ...clone(current),
      favoriteChamps,
      tips: tips.items,
      runePages: runePages.items,
      skillOrders: skillOrders.items,
      reviews: reviews.items,
    },
  }
}

function mergeItems<T extends Item>(
  mine: readonly T[],
  theirs: readonly T[],
  profile: Profile,
  packId: Uuid,
  allowForeign: boolean,
): { items: T[]; counts: ImportCounts } {
  const items = mine.map((item) => clone(item))
  const indexById = new Map(items.map((item, index) => [item.id, index]))
  const counts: ImportCounts = { added: 0, updated: 0, skipped: 0 }

  for (const incoming of theirs) {
    const isForeign = incoming.origin.authorId !== profile.authorId
    if (isForeign && !allowForeign) {
      counts.skipped++
      continue
    }
    const item = stampOrigin(incoming, isForeign, packId)
    const index = indexById.get(item.id)
    if (index === undefined) {
      indexById.set(item.id, items.length)
      items.push(item)
      counts.added++
    } else if (items[index]!.origin.type === 'mine' || item.updatedAt <= items[index]!.updatedAt) {
      counts.skipped++
    } else {
      items[index] = item
      counts.updated++
    }
  }
  return { items, counts }
}

function stampOrigin<T extends Item>(item: T, isForeign: boolean, packId: Uuid): T {
  const origin: Origin = isForeign
    ? { ...item.origin, type: 'imported', packId: item.origin.packId ?? packId }
    : { ...item.origin, type: 'mine' }
  return clone({ ...item, origin })
}

function mergeFavorites(mine: readonly ChampId[], theirs: readonly ChampId[]): ChampId[] {
  const merged = [...mine]
  for (const champ of theirs) if (!merged.includes(champ)) merged.push(champ)
  return merged
}

/** Everything in a plan that would change the notebook, for "nothing to import". */
export function importChangeCount(plan: ImportPlan): number {
  const lists = [plan.tips, plan.runePages, plan.skillOrders, plan.reviews]
  return lists.reduce((sum, counts) => sum + counts.added + counts.updated, plan.favoriteChamps)
}

/**
 * Deep copy through JSON. The notebook is plain JSON, and structuredClone
 * refuses the reactive proxies the store hands in.
 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
