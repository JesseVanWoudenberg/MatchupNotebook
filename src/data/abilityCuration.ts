import { z } from 'zod'
import { ChampId, Patch } from '@/schema'
import { AbilitySlot, CrowdControlKind, RankValues } from './abilities'
import bundledOverrides from './curated/overrides.json'
import bundledCrowdControl from './curated/crowdControl.json'
import bundledLaneCards from './curated/laneCards.json'

/**
 * The hand-kept half of the ability data. Data Dragon is right about nearly
 * everything; these two files cover what it cannot say. Both ship inside the
 * app and are edited in the repo, never at runtime. `npm run check-abilities`
 * drafts the crowd control file and lists what a person should look at.
 */

/** Why a base number is only a starting point. Shown as an icon next to it. */
export const ScalingKind = z.enum(['attack_speed', 'resistances', 'level', 'stacks'])
export type ScalingKind = z.infer<typeof ScalingKind>
export const SCALING_KINDS = ScalingKind.options

/** A correction or a mark for one ability. Every field is optional; set only what differs. */
export const AbilityOverride = z.strictObject({
  champ: ChampId,
  slot: AbilitySlot,
  cooldown: RankValues.optional(),
  cost: RankValues.optional(),
  costUnit: z.string().optional(),
  range: RankValues.optional(),
  /** The number exists but means nothing to the opponent, like a transform's 3 seconds. */
  hideCooldown: z.boolean().optional(),
  scaling: ScalingKind.optional(),
  /** A few words at most, like "2 charges" or "recast". */
  note: z.string().max(40).optional(),
  /** Replaces what the tooltip said. An empty list removes a wrong mark. */
  crowdControl: z.array(CrowdControlKind).optional(),
  /** The patch a person last checked this entry against the game. */
  verified: Patch.optional(),
})
export type AbilityOverride = z.infer<typeof AbilityOverride>

export const CrowdControlSource = z.enum(['wiki', 'prose', 'hand'])
export type CrowdControlSource = z.infer<typeof CrowdControlSource>

/** How long one ability's crowd control lasts, per rank. */
export const CrowdControlEntry = z.strictObject({
  champ: ChampId,
  slot: AbilitySlot,
  kind: CrowdControlKind,
  /** Seconds per rank, or one number. */
  seconds: RankValues,
  /** "wiki" for a structured wiki line, "prose" for a guess from wiki text, "hand" for a person. */
  source: CrowdControlSource,
  /** False until a person has looked at it. The UI shows unverified numbers dimmed. */
  verified: z.boolean(),
  /** The patch the value was read or checked on. */
  checkedPatch: Patch,
})
export type CrowdControlEntry = z.infer<typeof CrowdControlEntry>

/**
 * One ring on the range picture: an ability's own range, or a hand-written
 * reach for a combo or a sub-spell ("W then Q", "QQ") with the number a
 * person checked. The colour follows `slot` when given.
 */
export const RangeEntry = z.union([
  z.strictObject({ slot: AbilitySlot }),
  z.strictObject({
    label: z.string().min(1).max(20),
    range: z.number().positive(),
    slot: AbilitySlot.optional(),
  }),
])
export type RangeEntry = z.infer<typeof RangeEntry>

/**
 * What matters when laning against this champion: the ranges you can space.
 * A champion without a card gets the blanket rule in `model/rangeRings.ts`.
 */
export const LaneCard = z.strictObject({
  champ: ChampId,
  ranges: z.array(RangeEntry),
  /** A few words, like "W extends Q". */
  note: z.string().max(60).optional(),
  verified: Patch.optional(),
})
export type LaneCard = z.infer<typeof LaneCard>

export const AbilityOverrides = z.array(AbilityOverride)
export const CrowdControlEntries = z.array(CrowdControlEntry)
export const LaneCards = z.array(LaneCard)

export interface AbilityCuration {
  overrides: readonly AbilityOverride[]
  crowdControl: readonly CrowdControlEntry[]
  laneCards: readonly LaneCard[]
}

export function loadBundledCuration(): AbilityCuration {
  return {
    overrides: AbilityOverrides.parse(bundledOverrides),
    crowdControl: CrowdControlEntries.parse(bundledCrowdControl),
    laneCards: LaneCards.parse(bundledLaneCards),
  }
}

export function curationKey(champ: ChampId, slot: AbilitySlot): string {
  return `${champ}:${slot}`
}
