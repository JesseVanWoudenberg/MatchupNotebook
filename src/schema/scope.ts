import { z } from 'zod'
import { ChampId, Role } from './primitives'

/**
 * Tip scope. Every field is optional. Empty means "any".
 * At least one must be set: a tip always says something about a champ.
 */
export const TipScope = z
  .strictObject({
    myChamp: ChampId.optional(),
    enemy: ChampId.optional(),
    role: Role.optional(),
  })
  .refine((s) => s.myChamp !== undefined || s.enemy !== undefined || s.role !== undefined, {
    message: 'Scope needs at least one of myChamp, enemy or role',
  })
export type TipScope = z.infer<typeof TipScope>

/**
 * Matchup scope. Your champ is required. Used by rune pages and reviews,
 * and by the matchup view itself (you always open a matchup from your champ).
 */
export const MatchupScope = z.strictObject({
  myChamp: ChampId,
  enemy: ChampId.optional(),
  role: Role.optional(),
})
export type MatchupScope = z.infer<typeof MatchupScope>

/** How many fields a scope sets. Higher means more specific. Range 0 to 3. */
export function scopeSpecificity(scope: TipScope | MatchupScope): number {
  let n = 0
  if (scope.myChamp !== undefined) n++
  if (scope.enemy !== undefined) n++
  if (scope.role !== undefined) n++
  return n
}
