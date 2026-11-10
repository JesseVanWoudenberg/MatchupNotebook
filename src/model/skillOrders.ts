import { MAX_LEVEL, scopeSpecificity, type Ability, type SkillOrder } from '@/schema'
import { scopeFitsView, type FitOptions, type ScopeFilter } from './matchup'

/** Levels where the ultimate normally gets a point. */
export const ULTIMATE_LEVELS: readonly number[] = [6, 11, 16]

/** Rank caps for the standard pattern: basics stop at 5, the ultimate at 3. */
const BASIC_MAX_RANK = 5
const ULTIMATE_MAX_RANK = 3

/** Most specific first, then most recently changed. */
export function compareSkillOrdersForView(a: SkillOrder, b: SkillOrder): number {
  const bySpecificity = scopeSpecificity(b.scope) - scopeSpecificity(a.scope)
  if (bySpecificity !== 0) return bySpecificity
  return b.updatedAt.localeCompare(a.updatedAt)
}

export function skillOrdersForView(
  orders: readonly SkillOrder[],
  view: ScopeFilter,
  options: FitOptions = {},
): SkillOrder[] {
  return orders
    .filter((order) => scopeFitsView(order.scope, view, options))
    .sort(compareSkillOrdersForView)
}

export function bestSkillOrderForView(
  orders: readonly SkillOrder[],
  view: ScopeFilter,
): SkillOrder | undefined {
  return skillOrdersForView(orders, view)[0]
}

/**
 * "Q > W > E": basics in the order they reach their final rank. The
 * ultimate is left out because it is almost always 6, 11, 16.
 */
export function summarizeMaxOrder(levels: readonly Ability[]): string {
  const counts = new Map<Ability, number>()
  const finishedAt = new Map<Ability, number>()
  levels.forEach((ability, index) => {
    const count = (counts.get(ability) ?? 0) + 1
    counts.set(ability, count)
    finishedAt.set(ability, index)
  })
  const basics = [...counts.keys()].filter((ability) => ability !== 'R')
  basics.sort((a, b) => {
    const byCount = (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    if (byCount !== 0) return byCount
    return (finishedAt.get(a) ?? 0) - (finishedAt.get(b) ?? 0)
  })
  return basics.join(' > ')
}

/**
 * Fills the empty levels with the standard pattern: the start sequence on
 * levels 1 to 3, the ultimate at 6, 11 and 16, then the max order with each
 * basic to rank 5. Levels already set are kept, so a hand-made tweak on the
 * grid survives a second fill.
 */
export function fillStandardLevels(
  existing: readonly (Ability | undefined)[],
  start: readonly Ability[],
  maxOrder: readonly Ability[],
): Ability[] {
  const levels: (Ability | undefined)[] = Array.from(
    { length: MAX_LEVEL },
    (_, index) => existing[index],
  )
  start.forEach((ability, index) => {
    if (levels[index] === undefined) levels[index] = ability
  })

  const ranks = new Map<Ability, number>()
  const rankOf = (ability: Ability) => ranks.get(ability) ?? 0
  for (const ability of levels) if (ability) ranks.set(ability, rankOf(ability) + 1)
  const put = (index: number, ability: Ability) => {
    levels[index] = ability
    ranks.set(ability, rankOf(ability) + 1)
  }

  for (const level of ULTIMATE_LEVELS) {
    if (levels[level - 1] === undefined && rankOf('R') < ULTIMATE_MAX_RANK) put(level - 1, 'R')
  }

  const queue = [...maxOrder, ...(['Q', 'W', 'E'] as const)].filter(
    (ability, index, all) => ability !== 'R' && all.indexOf(ability) === index,
  )
  for (let index = 0; index < MAX_LEVEL; index++) {
    if (levels[index] !== undefined) continue
    const next = queue.find((ability) => rankOf(ability) < BASIC_MAX_RANK)
    put(index, next ?? 'R')
  }
  return levels.map((ability) => ability ?? 'R')
}

/** The standard pattern from scratch. */
export function buildStandardLevels(
  start: readonly Ability[],
  maxOrder: readonly Ability[],
): Ability[] {
  return fillStandardLevels([], start, maxOrder)
}
