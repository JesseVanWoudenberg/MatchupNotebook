import { describe, expect, it } from 'vitest'
import {
  bundledIconUrl,
  loadBundledChampions,
  normalizeChampionName,
  searchChampions,
  type Champion,
} from './champions'

const champions: Champion[] = [
  { id: 'Taliyah', key: 163, name: 'Taliyah' },
  { id: 'KSante', key: 897, name: "K'Sante" },
  { id: 'MonkeyKing', key: 62, name: 'Wukong' },
  { id: 'Nunu', key: 20, name: 'Nunu & Willump' },
  { id: 'Talon', key: 91, name: 'Talon' },
  { id: 'Kaisa', key: 145, name: "Kai'Sa" },
]

describe('normalizeChampionName', () => {
  it('drops case, punctuation and spaces', () => {
    expect(normalizeChampionName("K'Sante")).toBe('ksante')
    expect(normalizeChampionName('Nunu & Willump')).toBe('nunuwillump')
  })
})

describe('searchChampions', () => {
  it('returns everything alphabetically for an empty query', () => {
    expect(searchChampions(champions, '').map((c) => c.name)).toEqual([
      "K'Sante",
      "Kai'Sa",
      'Nunu & Willump',
      'Taliyah',
      'Talon',
      'Wukong',
    ])
  })
  it('puts prefix matches before matches anywhere', () => {
    expect(searchChampions(champions, 'tal').map((c) => c.name)).toEqual(['Taliyah', 'Talon'])
    expect(searchChampions(champions, 'sa').map((c) => c.name)).toEqual(["K'Sante", "Kai'Sa"])
  })
  it('ignores punctuation in the query', () => {
    expect(searchChampions(champions, "k'sa").map((c) => c.name)).toEqual(["K'Sante"])
    expect(searchChampions(champions, 'ksa').map((c) => c.name)).toEqual(["K'Sante"])
  })
  it('matches the Riot id as well as the display name', () => {
    expect(searchChampions(champions, 'monkey').map((c) => c.name)).toEqual(['Wukong'])
  })
})

describe('bundled snapshot', () => {
  it('validates and has every champion with an icon path', () => {
    const snapshot = loadBundledChampions()
    expect(snapshot.champions.length).toBeGreaterThan(150)
    expect(snapshot.champions.find((c) => c.id === 'MonkeyKing')?.name).toBe('Wukong')
    expect(bundledIconUrl('MonkeyKing')).toBe('/champion-icons/MonkeyKing.png')
  })
})
