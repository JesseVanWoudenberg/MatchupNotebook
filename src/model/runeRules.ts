import { SHARD_ROWS, type RunePerk, type RuneSnapshot, type RuneStyle } from '@/data/runes'

/**
 * League's rune page rules, checked against a rune snapshot. Used by the
 * editor while you build a page, and against stored pages after a patch to
 * decide whether a page "needs update".
 *
 * Slot layout of selectedPerkIds:
 *   0..3  primary tree: keystone, then one perk from each of the three rows
 *   4..5  secondary tree: two perks from two different rows (never keystones)
 *   6..8  stat shards: one from each shard row
 */
export const PRIMARY_SLOTS = [0, 1, 2, 3] as const
export const SECONDARY_SLOTS = [4, 5] as const
export const SHARD_SLOTS = [6, 7, 8] as const
export const SLOT_COUNT = 9

export type RuneSlot =
  (typeof PRIMARY_SLOTS)[number] | (typeof SECONDARY_SLOTS)[number] | (typeof SHARD_SLOTS)[number]

/** A page being built. Undefined means the slot is still empty. */
export interface RuneSelection {
  primaryStyleId: number | undefined
  subStyleId: number | undefined
  selectedPerkIds: (number | undefined)[]
}

/** A tree, or a slot index 0..8. */
export type RuneIssueTarget = 'primaryStyle' | 'subStyle' | number

export interface RuneIssue {
  target: RuneIssueTarget
  message: string
}

export function styleById(snapshot: RuneSnapshot, id: number | undefined): RuneStyle | undefined {
  return id === undefined ? undefined : snapshot.styles.find((style) => style.id === id)
}

export function perkById(snapshot: RuneSnapshot, id: number): RunePerk | undefined {
  for (const style of snapshot.styles) {
    for (const row of style.slots) {
      const perk = row.find((candidate) => candidate.id === id)
      if (perk) return perk
    }
  }
  return undefined
}

/** Which row (0..3) of a style holds the perk, or undefined when it is not in that style. */
export function rowOfPerk(style: RuneStyle, perkId: number): number | undefined {
  const index = style.slots.findIndex((row) => row.some((perk) => perk.id === perkId))
  return index < 0 ? undefined : index
}

export function rowOfShard(shardId: number, rowIndex: number): boolean {
  return SHARD_ROWS[rowIndex]?.some((shard) => shard.id === shardId) ?? false
}

/** Every rule violation, with the slot or tree it belongs to. Empty means the page is valid. */
export function validateRuneSelection(
  selection: RuneSelection,
  snapshot: RuneSnapshot,
): RuneIssue[] {
  const issues: RuneIssue[] = []
  const primary = styleById(snapshot, selection.primaryStyleId)
  const secondary = styleById(snapshot, selection.subStyleId)
  const perks = selection.selectedPerkIds

  if (!primary) issues.push({ target: 'primaryStyle', message: 'Pick a primary tree.' })
  if (!secondary) issues.push({ target: 'subStyle', message: 'Pick a secondary tree.' })
  if (primary && secondary && primary.id === secondary.id) {
    issues.push({ target: 'subStyle', message: 'The secondary tree must differ from the primary.' })
  }

  for (const slot of PRIMARY_SLOTS) {
    const perkId = perks[slot]
    if (perkId === undefined) {
      issues.push({ target: slot, message: slot === 0 ? 'Pick a keystone.' : 'Pick a rune.' })
    } else if (primary && rowOfPerk(primary, perkId) !== slot) {
      issues.push({ target: slot, message: 'This rune is not in this row anymore.' })
    }
  }

  const secondaryRows: number[] = []
  for (const slot of SECONDARY_SLOTS) {
    const perkId = perks[slot]
    if (perkId === undefined) {
      issues.push({ target: slot, message: 'Pick a secondary rune.' })
      continue
    }
    const row = secondary ? rowOfPerk(secondary, perkId) : undefined
    if (row === undefined || row === 0) {
      issues.push({ target: slot, message: 'This rune is not in the secondary tree anymore.' })
    } else if (secondaryRows.includes(row)) {
      issues.push({ target: slot, message: 'Secondary runes must come from different rows.' })
    } else {
      secondaryRows.push(row)
    }
  }

  SHARD_SLOTS.forEach((slot, index) => {
    const shardId = perks[slot]
    if (shardId === undefined) issues.push({ target: slot, message: 'Pick a shard.' })
    else if (!rowOfShard(shardId, index)) {
      issues.push({ target: slot, message: 'This shard is not in this row anymore.' })
    }
  })

  return issues
}

export function isRuneSelectionValid(selection: RuneSelection, snapshot: RuneSnapshot): boolean {
  return validateRuneSelection(selection, snapshot).length === 0
}

export function emptyRuneSelection(): RuneSelection {
  return {
    primaryStyleId: undefined,
    subStyleId: undefined,
    selectedPerkIds: Array.from({ length: SLOT_COUNT }, () => undefined),
  }
}
