import { describe, expect, it } from 'vitest'
import { loadBundledAbilities } from './abilities'
import {
  AbilityOverride,
  CrowdControlEntry,
  LaneCard,
  curationKey,
  loadBundledCuration,
} from './abilityCuration'

describe('AbilityOverride', () => {
  it('accepts a mark and rejects a long note or a stray field', () => {
    expect(
      AbilityOverride.safeParse({ champ: 'Yone', slot: 'Q', scaling: 'attack_speed' }).success,
    ).toBe(true)
    expect(
      AbilityOverride.safeParse({ champ: 'Yone', slot: 'Q', note: 'x'.repeat(41) }).success,
    ).toBe(false)
    expect(AbilityOverride.safeParse({ champ: 'Yone', slot: 'Q', damage: [10] }).success).toBe(
      false,
    )
  })
})

describe('CrowdControlEntry', () => {
  const entry = {
    champ: 'Morgana',
    slot: 'Q',
    kind: 'root',
    seconds: [2, 2.25, 2.5, 2.75, 3],
    source: 'wiki',
    verified: false,
    checkedPatch: '26.20',
  }

  it('accepts a wiki row and rejects a slow or an empty duration', () => {
    expect(CrowdControlEntry.safeParse(entry).success).toBe(true)
    expect(CrowdControlEntry.safeParse({ ...entry, kind: 'slow' }).success).toBe(false)
    expect(CrowdControlEntry.safeParse({ ...entry, seconds: [] }).success).toBe(false)
  })
})

describe('the bundled curated files', () => {
  const curation = loadBundledCuration()
  const known = new Set(
    loadBundledAbilities().champions.flatMap((champion) =>
      champion.abilities.map((ability) => curationKey(champion.id, ability.slot)),
    ),
  )

  it('only name champions and slots that exist in the bundled snapshot', () => {
    for (const override of curation.overrides) {
      expect(
        known.has(curationKey(override.champ, override.slot)),
        `${override.champ} ${override.slot}`,
      ).toBe(true)
    }
    for (const entry of curation.crowdControl) {
      expect(known.has(curationKey(entry.champ, entry.slot)), `${entry.champ} ${entry.slot}`).toBe(
        true,
      )
    }
  })

  it('have one override per ability at most', () => {
    const keys = curation.overrides.map((override) => curationKey(override.champ, override.slot))
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('LaneCard', () => {
  it('accepts slots and hand-written reaches, and rejects a reach without a number', () => {
    expect(
      LaneCard.safeParse({
        champ: 'Zed',
        ranges: [{ slot: 'Q' }, { label: 'W then Q', range: 1550, slot: 'Q' }],
        note: 'W extends Q',
      }).success,
    ).toBe(true)
    expect(LaneCard.safeParse({ champ: 'Zed', ranges: [{ label: 'W then Q' }] }).success).toBe(
      false,
    )
    expect(LaneCard.safeParse({ champ: 'Zed', ranges: [{ slot: 'P' }] }).success).toBe(false)
  })
})

describe('the bundled lane cards', () => {
  it('name real champions and slots, one card per champion', () => {
    const snapshot = loadBundledAbilities()
    const cards = loadBundledCuration().laneCards
    expect(new Set(cards.map((card) => card.champ)).size).toBe(cards.length)
    const unknown = cards.flatMap((card) => {
      const champion = snapshot.champions.find((entry) => entry.id === card.champ)
      if (!champion) return [card.champ]
      return card.ranges
        .filter(
          (entry) =>
            entry.slot !== undefined &&
            !champion.abilities.some((ability) => ability.slot === entry.slot),
        )
        .map((entry) => `${card.champ} ${entry.slot}`)
    })
    expect(unknown).toEqual([])
  })
})
