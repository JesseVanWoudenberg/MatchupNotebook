import { describe, expect, it } from 'vitest'
import { SHARD_NAMES, SHARD_ROWS, loadBundledRunes, parseRunesReforged } from './runes'

describe('bundled runes', () => {
  it('has the five trees with a keystone row and three rows each', () => {
    const snapshot = loadBundledRunes()
    expect(snapshot.styles.map((style) => style.key)).toEqual([
      'Precision',
      'Domination',
      'Sorcery',
      'Inspiration',
      'Resolve',
    ])
    for (const style of snapshot.styles) {
      expect(style.slots).toHaveLength(4)
      expect(style.slots[0]!.length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('shards', () => {
  it('has three rows of three', () => {
    expect(SHARD_ROWS.map((row) => row.length)).toEqual([3, 3, 3])
    expect(SHARD_NAMES[5008]).toBe('Adaptive Force')
  })
})

describe('parseRunesReforged', () => {
  it('converts Data Dragon rows and sorts trees by id', () => {
    const json = JSON.stringify([
      {
        id: 8200,
        key: 'Sorcery',
        name: 'Sorcery',
        icon: 'perk-images/Styles/7202_Sorcery.png',
        slots: [
          { runes: [{ id: 8214, key: 'SummonAery', name: 'Summon Aery', icon: 'a.png' }] },
          { runes: [{ id: 8275, key: 'NimbusCloak', name: 'Nimbus Cloak', icon: 'b.png' }] },
          { runes: [{ id: 8210, key: 'Transcendence', name: 'Transcendence', icon: 'c.png' }] },
          { runes: [{ id: 8237, key: 'Scorch', name: 'Scorch', icon: 'd.png' }] },
        ],
      },
      {
        id: 8000,
        key: 'Precision',
        name: 'Precision',
        icon: 'perk-images/Styles/7201_Precision.png',
        slots: [
          { runes: [{ id: 8005, key: 'PressTheAttack', name: 'Press the Attack', icon: 'e.png' }] },
          { runes: [{ id: 9101, key: 'Overheal', name: 'Overheal', icon: 'f.png' }] },
          { runes: [{ id: 9104, key: 'LegendAlacrity', name: 'Legend: Alacrity', icon: 'g.png' }] },
          { runes: [{ id: 8014, key: 'CoupDeGrace', name: 'Coup de Grace', icon: 'h.png' }] },
        ],
      },
    ])
    const snapshot = parseRunesReforged(json, '16.21.1')
    expect(snapshot.version).toBe('16.21.1')
    expect(snapshot.styles.map((style) => style.id)).toEqual([8000, 8200])
    expect(snapshot.styles[1]!.slots[0]![0]!.id).toBe(8214)
  })
  it('rejects junk', () => {
    expect(() => parseRunesReforged('[{"id": "x"}]', '16.21.1')).toThrow()
  })
})
