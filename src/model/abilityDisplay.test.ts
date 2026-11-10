import { describe, expect, it } from 'vitest'
import { loadBundledAbilities } from '@/data/abilities'
import type { AbilityCuration, CrowdControlEntry } from '@/data/abilityCuration'
import { cooldownText, costText, displayAbilities, formatRanks, rangeText } from './abilityDisplay'

const veigar = loadBundledAbilities().champions.find((champion) => champion.id === 'Veigar')!
const none: AbilityCuration = { overrides: [], crowdControl: [], laneCards: [] }

describe('displayAbilities', () => {
  it('passes Data Dragon through untouched without curation', () => {
    const rows = displayAbilities(veigar, none)
    expect(rows.map((row) => row.slot)).toEqual(['Q', 'W', 'E', 'R'])
    expect(rows[1]).toMatchObject({
      cooldown: [0],
      isCooldownHidden: false,
      crowdControlDurations: [],
    })
    expect(rows[1]!.scaling).toBeUndefined()
  })

  it('lets an override replace a number and add a mark', () => {
    const rows = displayAbilities(veigar, {
      overrides: [{ champ: 'Veigar', slot: 'W', cooldown: [8], scaling: 'stacks', note: 'drops' }],
      crowdControl: [],
      laneCards: [],
    })
    expect(rows[1]).toMatchObject({ cooldown: [8], scaling: 'stacks', note: 'drops' })
    expect(rows[0]!.cooldown).toEqual(veigar.abilities[0]!.cooldown)
  })

  it('attaches durations for the kinds the ability has, and drops the rest', () => {
    const entry: CrowdControlEntry = {
      champ: 'Veigar',
      slot: 'E',
      kind: 'stun',
      seconds: [1.5, 1.75, 2, 2.25, 2.5],
      source: 'wiki',
      verified: false,
      checkedPatch: '26.20',
    }
    const withStun = displayAbilities(veigar, {
      overrides: [],
      crowdControl: [entry],
      laneCards: [],
    })
    expect(withStun[2]!.crowdControlDurations).toEqual([entry])
    const removed = displayAbilities(veigar, {
      overrides: [{ champ: 'Veigar', slot: 'E', crowdControl: [] }],
      crowdControl: [entry],
      laneCards: [],
    })
    expect(removed[2]!.crowdControl).toEqual([])
    expect(removed[2]!.crowdControlDurations).toEqual([])
  })

  it('hides a cooldown on request', () => {
    const rows = displayAbilities(veigar, {
      overrides: [{ champ: 'Veigar', slot: 'R', hideCooldown: true }],
      crowdControl: [],
      laneCards: [],
    })
    expect(rows[3]!.isCooldownHidden).toBe(true)
    expect(cooldownText(rows[3]!)).toBeUndefined()
  })
})

describe('formatRanks', () => {
  it('joins ranks with slashes and keeps decimals as they are', () => {
    expect(formatRanks([15, 13.75, 12.5, 11.25, 10])).toBe('15 / 13.75 / 12.5 / 11.25 / 10')
    expect(formatRanks([6])).toBe('6')
  })
})

describe('cooldownText', () => {
  it('shows the ranks and hides a zero cooldown', () => {
    expect(cooldownText({ cooldown: [120, 110, 100] })).toBe('120 / 110 / 100')
    expect(cooldownText({ cooldown: [0] })).toBeUndefined()
  })
})

describe('costText', () => {
  it('appends the unit and hides free abilities', () => {
    expect(costText({ cost: [75, 70, 65, 60, 55], costUnit: 'energy' })).toBe(
      '75 / 70 / 65 / 60 / 55 energy',
    )
    expect(costText({ cost: [0], costUnit: '' })).toBeUndefined()
    expect(costText({ cost: [0], costUnit: 'mana' })).toBeUndefined()
  })
})

describe('rangeText', () => {
  it('shows a number, calls placeholders global, and hides self-cast', () => {
    expect(rangeText({ range: [925] })).toBe('925')
    expect(rangeText({ range: [25000] })).toBe('global')
    expect(rangeText({ range: [0] })).toBeUndefined()
  })
})
