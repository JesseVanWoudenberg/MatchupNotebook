import { z } from 'zod'
import { ItemBase, Patch, Uuid } from './primitives'
import { TipScope } from './scope'

export const TipKind = z.enum(['setup', 'early', 'watch_out', 'win_con', 'general'])
export type TipKind = z.infer<typeof TipKind>
export const TIP_KINDS = TipKind.options

export const Tip = ItemBase.extend({
  scope: TipScope,
  kind: TipKind,
  text: z.string().trim().min(1, 'A tip needs some text'),
  patch: Patch,
  /**
   * The review this tip came from. May point at a review that is not
   * in the file: share exports leave reviews out, so imported tips can
   * carry a dangling id. Treat it as a hint, never as a hard link.
   */
  reviewId: Uuid.optional(),
})
export type Tip = z.infer<typeof Tip>
