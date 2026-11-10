import { describe, expect, it } from 'vitest'
import { MatchupScope, TipScope, scopeSpecificity } from './scope'

describe('TipScope', () => {
  it('accepts any single field', () => {
    expect(TipScope.safeParse({ myChamp: 'Taliyah' }).success).toBe(true)
    expect(TipScope.safeParse({ enemy: 'Yasuo' }).success).toBe(true)
    expect(TipScope.safeParse({ role: 'top' }).success).toBe(true)
  })
  it('accepts all three', () => {
    expect(TipScope.safeParse({ myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' }).success).toBe(
      true,
    )
  })
  it('rejects an empty scope', () => {
    const r = TipScope.safeParse({})
    expect(r.success).toBe(false)
  })
  it('rejects unknown fields', () => {
    expect(TipScope.safeParse({ myChamp: 'Taliyah', lane: 'mid' }).success).toBe(false)
  })
  it('rejects explicit undefined being the only content', () => {
    expect(TipScope.safeParse({ myChamp: undefined }).success).toBe(false)
  })
})

describe('MatchupScope', () => {
  it('requires myChamp', () => {
    expect(MatchupScope.safeParse({ enemy: 'Yasuo' }).success).toBe(false)
    expect(MatchupScope.safeParse({ myChamp: 'Taliyah' }).success).toBe(true)
  })
})

describe('scopeSpecificity', () => {
  it('counts set fields', () => {
    expect(scopeSpecificity({ myChamp: 'Taliyah' })).toBe(1)
    expect(scopeSpecificity({ myChamp: 'Taliyah', enemy: 'Yasuo' })).toBe(2)
    expect(scopeSpecificity({ myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' })).toBe(3)
  })
})
