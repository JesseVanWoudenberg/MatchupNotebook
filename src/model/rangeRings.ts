import type { AbilitySlot, ChampionAbilities } from '@/data/abilities'
import type { LaneCard } from '@/data/abilityCuration'
import { GLOBAL_RANGE, type DisplayAbility } from './abilityDisplay'

/**
 * Which ranges the picture draws around a champion. A lane card decides;
 * without one the blanket rule keeps every ability you could space and
 * drops the self-casts, the globals and the very long ones you dodge
 * rather than space.
 */
export const MAX_LANE_RANGE = 1500

export interface RangeRing {
  label: string
  units: number
  /** Colours the ring; undefined for the basic attack and unslotted hand entries. */
  slot?: AbilitySlot
  isAttack: boolean
}

/** The reach at max rank: the longest value in the list. */
function reachOf(row: DisplayAbility): number {
  return Math.max(...row.range)
}

function fallbackRings(rows: readonly DisplayAbility[]): RangeRing[] {
  return rows.flatMap((row): RangeRing[] => {
    const units = reachOf(row)
    if (units <= 0 || units >= GLOBAL_RANGE || units > MAX_LANE_RANGE) return []
    return [{ label: `${row.slot} ${units}`, units, slot: row.slot, isAttack: false }]
  })
}

function cardRings(card: LaneCard, rows: readonly DisplayAbility[]): RangeRing[] {
  return card.ranges.flatMap((entry): RangeRing[] => {
    if ('range' in entry) {
      return [
        {
          label: `${entry.label} ${entry.range}`,
          units: entry.range,
          ...(entry.slot !== undefined && { slot: entry.slot }),
          isAttack: false,
        },
      ]
    }
    const row = rows.find((candidate) => candidate.slot === entry.slot)
    if (!row) return []
    const units = reachOf(row)
    if (units <= 0 || units >= GLOBAL_RANGE) return []
    return [{ label: `${row.slot} ${units}`, units, slot: row.slot, isAttack: false }]
  })
}

/** The basic attack first, then the abilities, each once, longest last for drawing order. */
export function rangeRings(
  champion: Pick<ChampionAbilities, 'attackRange'>,
  rows: readonly DisplayAbility[],
  card: LaneCard | undefined,
): RangeRing[] {
  const attack: RangeRing = {
    label: `Attack ${champion.attackRange}`,
    units: champion.attackRange,
    isAttack: true,
  }
  const abilities = card ? cardRings(card, rows) : fallbackRings(rows)
  return [attack, ...abilities].sort((a, b) => a.units - b.units)
}
