import { describe, expect, it } from 'vitest'
import { loadBundledAbilities } from '@/data/abilities'
import type { AbilityCuration } from '@/data/abilityCuration'
import { displayAbilities } from './abilityDisplay'
import { MAX_LANE_RANGE, rangeRings } from './rangeRings'

const none: AbilityCuration = { overrides: [], crowdControl: [], laneCards: [] }
const champion = (id: string) => loadBundledAbilities().champions.find((entry) => entry.id === id)!

describe('rangeRings without a lane card', () => {
  it('keeps the spaceable abilities and drops self, global and very long ones', () => {
    const akshan = champion('Akshan')
    const rings = rangeRings(akshan, displayAbilities(akshan, none), undefined)
    expect(rings.map((ring) => ring.label)).toEqual(['Attack 500', 'E 800', 'Q 850'])
    expect(rings[0]!.isAttack).toBe(true)
  })

  it('never draws a global or a self-cast', () => {
    const leblanc = champion('Leblanc')
    const labels = rangeRings(leblanc, displayAbilities(leblanc, none), undefined).map(
      (ring) => ring.label,
    )
    expect(labels).not.toContain(expect.stringMatching(/^R /))
    expect(labels).toEqual(['Attack 525', 'W 600', 'Q 700', 'E 925'])
    const garen = champion('Garen')
    expect(rangeRings(garen, displayAbilities(garen, none), undefined).map((r) => r.label)).toEqual(
      ['Attack 175', 'Q 300', 'E 325', 'R 400'],
    )
  })

  it('uses the longest rank and the lane limit', () => {
    const taliyah = champion('Taliyah')
    const rings = rangeRings(taliyah, displayAbilities(taliyah, none), undefined)
    expect(rings.every((ring) => ring.units <= MAX_LANE_RANGE)).toBe(true)
    expect(rings.map((ring) => ring.label)).not.toContain(expect.stringMatching(/^R /))
  })
})

describe('rangeRings with a lane card', () => {
  it('draws exactly the card, slots from the data and hand entries as written', () => {
    const zed = champion('Zed')
    const rings = rangeRings(zed, displayAbilities(zed, none), {
      champ: 'Zed',
      ranges: [{ slot: 'Q' }, { label: 'W then Q', range: 1550, slot: 'Q' }],
    })
    expect(rings.map((ring) => ring.label)).toEqual(['Attack 125', 'Q 900', 'W then Q 1550'])
    expect(rings[2]).toMatchObject({ slot: 'Q', units: 1550, isAttack: false })
  })

  it('ignores a slot the data does not know a range for', () => {
    const leblanc = champion('Leblanc')
    const rings = rangeRings(leblanc, displayAbilities(leblanc, none), {
      champ: 'Leblanc',
      ranges: [{ slot: 'R' }, { slot: 'Q' }],
    })
    expect(rings.map((ring) => ring.label)).toEqual(['Attack 525', 'Q 700'])
  })
})
