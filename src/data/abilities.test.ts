import { describe, expect, it } from 'vitest'
import sample from '@/test/fixtures/championFullSample.json'
import {
  Ability,
  AbilitySnapshot,
  ChampionAbilities,
  costUnitOf,
  crowdControlFromTooltip,
  parseBurn,
  parseChampionFull,
  type AbilitySlot,
} from './abilities'

const snapshot = parseChampionFull(JSON.stringify(sample))

function ability(champ: string, slot: AbilitySlot) {
  const champion = snapshot.champions.find((entry) => entry.id === champ)
  if (!champion) throw new Error(`${champ} is not in the sample`)
  return champion.abilities.find((entry) => entry.slot === slot)!
}

describe('parseBurn', () => {
  it('keeps one number per rank and collapses equal ranks', () => {
    expect(parseBurn('16/14/12/10/8/6')).toEqual([16, 14, 12, 10, 8, 6])
    expect(parseBurn('6')).toEqual([6])
    expect(parseBurn('10/10/10/10/10')).toEqual([10])
  })

  it('turns junk into 0 instead of NaN', () => {
    expect(parseBurn('')).toEqual([0])
    expect(parseBurn('x/5')).toEqual([0, 5])
  })
})

describe('costUnitOf', () => {
  it('uses the champion resource for the placeholder', () => {
    expect(costUnitOf(' {{ abilityresourcename }}', 'Mana', [50])).toBe('mana')
    expect(costUnitOf(' {{ abilityresourcename }}', 'Energy', [40])).toBe('energy')
  })

  it('is empty when nothing is spent', () => {
    expect(costUnitOf('No Cost', 'None', [0])).toBe('')
    expect(costUnitOf(' {{ abilityresourcename }}', 'Mana', [0])).toBe('')
  })

  it('cleans leftover placeholders from odd cost types', () => {
    expect(costUnitOf('% of current Health ({{ healthcosttooltip }})', 'Mana', [10])).toBe(
      '% of current health',
    )
  })
})

describe('crowdControlFromTooltip', () => {
  it('reads the status tags', () => {
    expect(crowdControlFromTooltip('<status>Roots</status> the first enemy')).toEqual(['root'])
    expect(
      crowdControlFromTooltip('<status>Stunning</status> and <status>Charms</status>'),
    ).toEqual(['stun', 'charm'])
  })

  it('reads a knock up split over two tags, and a knock back', () => {
    expect(
      crowdControlFromTooltip(
        '<status>Knocking</status> them <status>Up</status> and <status>Stunning</status>',
      ),
    ).toEqual(['stun', 'knockup'])
    expect(crowdControlFromTooltip('<status>Knocking Back</status> his target')).toEqual([
      'knockback',
    ])
  })

  it('ignores slows and shields that only mention crowd control', () => {
    expect(crowdControlFromTooltip('<status>Slowing</status> enemies by 30%')).toEqual([])
    expect(
      crowdControlFromTooltip(
        'prevents <status>Disabling</status> and <status>Immobilizing</status> effects',
      ),
    ).toEqual([])
    expect(crowdControlFromTooltip('knocks them up with no status tag at all')).toEqual([])
  })
})

describe('parseChampionFull', () => {
  it('keeps the version and one entry per champion, sorted by id', () => {
    expect(snapshot.version).toBe(sample.version)
    expect(snapshot.champions.map((champion) => champion.id)).toEqual(
      Object.keys(sample.data).sort((a, b) => a.localeCompare(b)),
    )
  })

  it('reads attack range and resource', () => {
    const leblanc = snapshot.champions.find((champion) => champion.id === 'Leblanc')!
    expect(leblanc.attackRange).toBe(525)
    expect(leblanc.resource).toBe('Mana')
  })

  it('reads cooldowns per rank, including six ranks', () => {
    expect(ability('Leblanc', 'W').cooldown).toEqual([15, 13.75, 12.5, 11.25, 10])
    expect(ability('Leblanc', 'Q').cooldown).toEqual([6])
    expect(ability('Jayce', 'Q').cooldown).toEqual([16, 14, 12, 10, 8, 6])
    expect(ability('Jayce', 'Q').maxRank).toBe(6)
    expect(ability('Zed', 'R').cooldown).toEqual([120, 110, 100])
  })

  it('reads costs with their unit', () => {
    expect(ability('Zed', 'Q')).toMatchObject({ cost: [75, 70, 65, 60, 55], costUnit: 'energy' })
    expect(ability('Morgana', 'Q')).toMatchObject({ cost: [50, 55, 60, 65, 70], costUnit: 'mana' })
    expect(ability('Garen', 'Q')).toMatchObject({ cost: [0], costUnit: '' })
    // Restores energy rather than spending it.
    expect(ability('Akali', 'W')).toMatchObject({ cost: [0], costUnit: '' })
  })

  it('keeps Data Dragon ranges as they are, junk included', () => {
    expect(ability('Leblanc', 'E').range).toEqual([925])
    expect(ability('Leblanc', 'R').range).toEqual([25000])
    expect(ability('Garen', 'W').range).toEqual([0])
  })

  it('reads charges and the zero cooldown of an attack-like ability', () => {
    expect(ability('Corki', 'R').charges).toBe(4)
    expect(ability('Corki', 'Q').charges).toBe(0)
    expect(ability('Zeri', 'Q').cooldown).toEqual([0])
  })

  it('reads crowd control kinds from the tooltips', () => {
    expect(ability('Morgana', 'Q').crowdControl).toEqual(['root'])
    expect(ability('Nautilus', 'Q').crowdControl).toEqual(['stun'])
    expect(ability('Nautilus', 'R').crowdControl).toEqual(['stun', 'knockup'])
    expect(ability('Garen', 'Q').crowdControl).toEqual(['silence'])
    expect(ability('Zed', 'W').crowdControl).toEqual([])
  })

  it('names the icon file', () => {
    expect(ability('Leblanc', 'W').icon).toBe('LeblancW.png')
  })

  it('rejects a response without spells', () => {
    expect(() => parseChampionFull(JSON.stringify({ version: '1', data: { X: {} } }))).toThrow()
  })
})

describe('schemas', () => {
  const valid = ability('Leblanc', 'Q')

  it('accept the parsed ability and reject an empty rank list', () => {
    expect(Ability.safeParse(valid).success).toBe(true)
    expect(Ability.safeParse({ ...valid, cooldown: [] }).success).toBe(false)
    expect(Ability.safeParse({ ...valid, crowdControl: ['slow'] }).success).toBe(false)
  })

  it('need exactly four abilities per champion', () => {
    const champion = snapshot.champions[0]!
    expect(ChampionAbilities.safeParse(champion).success).toBe(true)
    expect(
      ChampionAbilities.safeParse({ ...champion, abilities: champion.abilities.slice(0, 3) })
        .success,
    ).toBe(false)
  })

  it('need at least one champion in a snapshot', () => {
    expect(AbilitySnapshot.safeParse(snapshot).success).toBe(true)
    expect(AbilitySnapshot.safeParse({ version: '1', champions: [] }).success).toBe(false)
  })
})
