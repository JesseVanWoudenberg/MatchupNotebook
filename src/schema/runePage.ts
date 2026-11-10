import { z } from 'zod'
import { ItemBase, Patch } from './primitives'
import { MatchupScope } from './scope'

/** Rune style (tree) ids and perk ids are Riot's numeric ids from Data Dragon. */
export const RuneStyleId = z.int().positive()
export const PerkId = z.int().positive()

/**
 * 4 primary perks (keystone first), 2 secondary perks, 3 stat shards.
 * League's slot rules (one per row, no two from the same secondary row) are
 * enforced by the rune editor against live rune data, not by this schema,
 * because the rows change per patch.
 */
export const SELECTED_PERK_COUNT = 9

export const RunePage = ItemBase.extend({
  scope: MatchupScope,
  name: z.string().trim().min(1, 'A rune page needs a name'),
  primaryStyleId: RuneStyleId,
  subStyleId: RuneStyleId,
  selectedPerkIds: z.array(PerkId).length(SELECTED_PERK_COUNT),
  patch: Patch,
}).refine((p) => p.primaryStyleId !== p.subStyleId, {
  message: 'Primary and secondary tree must differ',
  path: ['subStyleId'],
})
export type RunePage = z.infer<typeof RunePage>
