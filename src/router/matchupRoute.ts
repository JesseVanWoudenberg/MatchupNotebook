import type { RouteLocationRaw } from 'vue-router'
import type { ChampId, Role } from '@/schema'

export const MATCHUP_TABS = ['tips', 'runes', 'skills', 'numbers'] as const
export type MatchupTab = (typeof MATCHUP_TABS)[number]

export interface MatchupRouteInput {
  myChamp: ChampId
  enemy?: ChampId
  role?: Role
  /** Which tab the matchup page opens on. Only the Matchup route reads it. */
  tab?: MatchupTab
  /** Include matchup-specific items on a champ page. Only the Matchup route reads it. */
  all?: boolean
}

export type MatchupRouteName = 'Matchup' | 'Reviews' | 'NewReview' | 'NewRunePage' | 'NewSkillOrder'

/** Location for a route shaped like /…/:myChamp/:enemy?  with ?role=. */
export function matchupRoute(name: MatchupRouteName, input: MatchupRouteInput): RouteLocationRaw {
  return {
    name,
    params: { myChamp: input.myChamp, enemy: input.enemy ?? '' },
    query: {
      ...(input.role && { role: input.role }),
      ...(input.tab && input.tab !== 'tips' && { tab: input.tab }),
      ...(input.all && { all: '1' }),
    },
  }
}
