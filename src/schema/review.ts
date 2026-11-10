import { z } from 'zod'
import { ItemBase, Patch } from './primitives'
import { MatchupScope } from './scope'

/**
 * A post-game review. Always private. Left out of share exports.
 * Not in the phase 1 UI, but tips already point at it via reviewId.
 */
export const Review = ItemBase.extend({
  scope: MatchupScope,
  text: z.string().trim().min(1, 'A review needs some text'),
  patch: Patch,
})
export type Review = z.infer<typeof Review>
