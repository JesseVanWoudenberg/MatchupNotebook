import { z } from 'zod'
import { ItemBase, Patch } from './primitives'
import { MatchupScope } from './scope'

export const Ability = z.enum(['Q', 'W', 'E', 'R'])
export type Ability = z.infer<typeof Ability>
export const ABILITIES = Ability.options

/** League champions level up 18 times. */
export const MAX_LEVEL = 18

/**
 * Which ability to level at each of the 18 levels. One flat list covers the
 * normal case and the odd champions (Udyr's four basics, early R on Jayce)
 * without special rules. Rank caps are not enforced; that is the player's
 * call and the client's job.
 */
export const SkillOrder = ItemBase.extend({
  scope: MatchupScope,
  name: z.string().trim().min(1, 'A skill order needs a name'),
  levels: z.array(Ability).length(MAX_LEVEL),
  patch: Patch,
})
export type SkillOrder = z.infer<typeof SkillOrder>
