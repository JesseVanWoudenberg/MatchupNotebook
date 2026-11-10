import { describe, expect, it } from 'vitest'
import { describeScope, tierLabel } from './labels'

const nameOf = (id: string) => (id === 'MonkeyKing' ? 'Wukong' : id)

describe('describeScope', () => {
  it('describes every shape of scope', () => {
    expect(describeScope({ myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' }, nameOf)).toBe(
      'Taliyah vs Yasuo, mid',
    )
    expect(describeScope({ myChamp: 'Taliyah', enemy: 'Yasuo' }, nameOf)).toBe('Taliyah vs Yasuo')
    expect(describeScope({ myChamp: 'Taliyah' }, nameOf)).toBe('Taliyah in general')
    expect(describeScope({ myChamp: 'Taliyah', role: 'top' }, nameOf)).toBe('Taliyah, top')
    expect(describeScope({ enemy: 'Yasuo' }, nameOf)).toBe('Against Yasuo')
    expect(describeScope({ enemy: 'Yasuo', role: 'top' }, nameOf)).toBe('Against Yasuo, top')
    expect(describeScope({ role: 'support' }, nameOf)).toBe('Any support game')
  })
  it('uses display names, not ids', () => {
    expect(describeScope({ myChamp: 'MonkeyKing' }, nameOf)).toBe('Wukong in general')
  })
})

describe('tierLabel', () => {
  it('names the four tiers and falls back for anything else', () => {
    expect([3, 2, 1, 0].map(tierLabel)).toEqual([
      'This matchup, this lane',
      'This matchup',
      'General',
      'Lane only',
    ])
    expect(tierLabel(7)).toBe('Other')
  })
})
