import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { Role, type MatchupScope } from '@/schema'

/** Reads :myChamp, :enemy? and ?role= from a matchup-shaped route. */
export function scopeFromRoute(route: RouteLocationNormalizedLoaded): MatchupScope {
  const enemyParam = route.params.enemy
  const enemy = typeof enemyParam === 'string' && enemyParam !== '' ? enemyParam : undefined
  const role = Role.safeParse(route.query.role).data
  return {
    myChamp: String(route.params.myChamp ?? ''),
    ...(enemy !== undefined && { enemy }),
    ...(role !== undefined && { role }),
  }
}
