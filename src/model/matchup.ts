import {
  scopeSpecificity,
  type ChampId,
  type Patch,
  type Role,
  type Tip,
  type TipScope,
} from '@/schema'
import { patchesBehind } from '@/data/patch'

/**
 * What the user is looking at. Every field optional. Unlike TipScope this is
 * not stored, so it has no "at least one" rule. An empty view is not "every
 * tip": it matches only tips scoped by role alone. To list every tip, use the
 * list itself.
 */
export interface ScopeFilter {
  myChamp?: ChampId
  enemy?: ChampId
  role?: Role
}

/**
 * Does a tip belong in this view?
 *
 * Champ fields: a tip shows when its field is "any" or matches the view. When
 * the view leaves a champ field empty, only tips that also leave it empty
 * show. Opening "Taliyah" shows Taliyah-in-general tips, not every Taliyah
 * matchup.
 *
 * Role is looser for champion-anchored tips: when the view has no lane, a
 * "Taliyah vs Yasuo, mid" tip still shows on the Taliyah vs Yasuo page, with
 * the lane icon. A tip that has only a lane and no champion ("any jungle
 * game") shows only when that lane is selected, otherwise it would appear on
 * every champion's page.
 */
export function tipFitsScope(tip: Tip, view: ScopeFilter, options: FitOptions = {}): boolean {
  return scopeFitsView(tip.scope, view, options)
}

export interface FitOptions {
  /**
   * When the view leaves a champ field empty, also show items that set it.
   * Used by the "include specific matchups" toggle on a champ's page, so
   * Taliyah's page can list her Yasuo tips too.
   */
  includeNarrower?: boolean
}

/** The same rule for anything with a scope: tips, rune pages, skill orders. */
export function scopeFitsView(
  scope: TipScope,
  view: ScopeFilter,
  options: FitOptions = {},
): boolean {
  const includeNarrower = options.includeNarrower ?? false
  return (
    champFieldFits(scope.myChamp, view.myChamp, includeNarrower) &&
    champFieldFits(scope.enemy, view.enemy, includeNarrower) &&
    roleFits(scope, view)
  )
}

function roleFits(scope: TipScope, view: ScopeFilter): boolean {
  if (scope.role === undefined) return true
  if (view.role !== undefined) return scope.role === view.role
  const isLaneOnly = scope.myChamp === undefined && scope.enemy === undefined
  return !isLaneOnly
}

function champFieldFits(
  itemValue: ChampId | undefined,
  viewValue: ChampId | undefined,
  includeNarrower: boolean,
): boolean {
  if (viewValue === undefined) return includeNarrower || itemValue === undefined
  return itemValue === undefined || itemValue === viewValue
}

/** Most specific first, then most recently changed first. */
export function compareTipsForView(a: Tip, b: Tip): number {
  const bySpecificity = scopeSpecificity(b.scope) - scopeSpecificity(a.scope)
  if (bySpecificity !== 0) return bySpecificity
  return b.updatedAt.localeCompare(a.updatedAt)
}

/** Every tip that fits the view, most specific first. */
export function tipsForScope(
  tips: readonly Tip[],
  view: ScopeFilter,
  options: FitOptions = {},
): Tip[] {
  return tips.filter((tip) => tipFitsScope(tip, view, options)).sort(compareTipsForView)
}

export interface TipTier {
  specificity: number
  tips: Tip[]
}

/** Group already-sorted tips into tiers by specificity, most specific first. */
export function groupTipsByTier(sortedTips: readonly Tip[]): TipTier[] {
  const tiers: TipTier[] = []
  for (const tip of sortedTips) {
    const specificity = scopeSpecificity(tip.scope)
    const last = tiers.at(-1)
    if (last && last.specificity === specificity) last.tips.push(tip)
    else tiers.push({ specificity, tips: [tip] })
  }
  return tiers
}

export function isMine(tip: Tip): boolean {
  return tip.origin.type === 'mine'
}

/**
 * For the "older than X patches" filter. A tip whose patch cannot be placed
 * at all counts as old: it is malformed or from before anything we know.
 */
export function isOlderThan(
  tip: Tip,
  patchesAgo: number,
  currentPatch: Patch,
  knownPatchesNewestFirst: readonly Patch[] = [],
): boolean {
  const behind = patchesBehind(currentPatch, tip.patch, knownPatchesNewestFirst)
  return behind === undefined || behind > patchesAgo
}

/** The optional list filters. Undefined means off. */
export interface TipListFilters {
  onlyMine: boolean
  /** Hide tips more than this many patches behind the current one. */
  hideOlderThan?: number
}

export const NO_FILTERS: TipListFilters = { onlyMine: false }

export function applyTipFilters(
  tips: readonly Tip[],
  filters: TipListFilters,
  currentPatch: Patch | undefined,
  knownPatchesNewestFirst: readonly Patch[] = [],
): Tip[] {
  return tips.filter((tip) => {
    if (filters.onlyMine && !isMine(tip)) return false
    if (
      filters.hideOlderThan !== undefined &&
      currentPatch !== undefined &&
      isOlderThan(tip, filters.hideOlderThan, currentPatch, knownPatchesNewestFirst)
    ) {
      return false
    }
    return true
  })
}
