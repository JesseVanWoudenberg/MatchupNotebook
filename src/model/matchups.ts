import type { ChampId, Notebook, TipScope } from '@/schema'
import type { ChampionNamer } from './labels'

/** Items that share a scope shape, bucketed by the enemy they are about. */
export interface EnemyGroup<T> {
  /** Undefined is the champ-wide group: no enemy set. Always first. */
  enemy: ChampId | undefined
  items: T[]
}

/**
 * Buckets items by enemy for the "show all matchups" view: the champ-wide
 * group first, then one group per enemy in display-name order. Item order
 * inside a group is kept, so pass them sorted.
 */
export function groupByEnemy<T extends { scope: TipScope }>(
  items: readonly T[],
  nameOf: ChampionNamer,
): EnemyGroup<T>[] {
  const buckets = new Map<ChampId | undefined, T[]>()
  for (const item of items) {
    const key = item.scope.enemy
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }

  const general = buckets.get(undefined)
  const enemies = [...buckets.entries()]
    .filter((entry): entry is [ChampId, T[]] => entry[0] !== undefined)
    .sort((a, b) => nameOf(a[0]).localeCompare(nameOf(b[0])))
    .map(([enemy, groupItems]) => ({ enemy, items: groupItems }))

  return general ? [{ enemy: undefined, items: general }, ...enemies] : enemies
}

/** How much a champ has written about one enemy. */
export interface MatchupContent {
  enemy: ChampId
  tips: number
  runePages: number
  skillOrders: number
  total: number
}

/**
 * Every enemy your champ has content for, by name. Counts only items
 * anchored to this champ; "against Yasuo for any champ" tips are not a
 * Taliyah matchup until you open it.
 */
export function matchupsWithContent(
  notebook: Pick<Notebook, 'tips' | 'runePages' | 'skillOrders'>,
  myChamp: ChampId,
  nameOf: ChampionNamer,
): MatchupContent[] {
  const byEnemy = new Map<ChampId, MatchupContent>()
  const bump = (scope: TipScope, field: 'tips' | 'runePages' | 'skillOrders') => {
    if (scope.myChamp !== myChamp || scope.enemy === undefined) return
    const entry = byEnemy.get(scope.enemy) ?? {
      enemy: scope.enemy,
      tips: 0,
      runePages: 0,
      skillOrders: 0,
      total: 0,
    }
    entry[field] += 1
    entry.total += 1
    byEnemy.set(scope.enemy, entry)
  }
  for (const tip of notebook.tips) bump(tip.scope, 'tips')
  for (const page of notebook.runePages) bump(page.scope, 'runePages')
  for (const order of notebook.skillOrders) bump(order.scope, 'skillOrders')
  return [...byEnemy.values()].sort((a, b) => nameOf(a.enemy).localeCompare(nameOf(b.enemy)))
}
