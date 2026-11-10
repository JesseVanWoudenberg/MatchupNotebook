import { describe, expect, it } from 'vitest'
import { comparePatches, displayPatchFromDataDragon, parsePatch, patchesBehind } from './patch'

describe('displayPatchFromDataDragon', () => {
  it('converts a Data Dragon version to the player-facing patch', () => {
    expect(displayPatchFromDataDragon('16.20.1')).toBe('26.20')
    expect(displayPatchFromDataDragon('16.1.1')).toBe('26.1')
    expect(displayPatchFromDataDragon('15.24.1')).toBe('25.24')
  })
  it('throws on junk', () => {
    expect(() => displayPatchFromDataDragon('lolpatch')).toThrow()
  })
})

describe('parsePatch and comparePatches', () => {
  it('parses', () => {
    expect(parsePatch('26.20')).toEqual({ major: 26, minor: 20 })
    expect(parsePatch('26.20.1')).toBeUndefined()
  })
  it('orders numerically, not as text', () => {
    expect(comparePatches('26.9', '26.10')).toBeLessThan(0)
    expect(comparePatches('26.1', '25.24')).toBeGreaterThan(0)
    expect(comparePatches('26.20', '26.20')).toBe(0)
  })
})

describe('patchesBehind', () => {
  const known = ['26.20', '26.19', '26.18', '26.17']
  it('counts positions in the known list', () => {
    expect(patchesBehind('26.20', '26.20', known)).toBe(0)
    expect(patchesBehind('26.20', '26.17', known)).toBe(3)
  })
  it('estimates from the numbers when the list does not help', () => {
    expect(patchesBehind('26.20', '26.15')).toBe(5)
    expect(patchesBehind('26.20', '26.15', known)).toBe(5)
    expect(patchesBehind('26.2', '25.22')).toBe(4)
    expect(patchesBehind('26.20', '26.21')).toBe(-1)
  })
  it('returns undefined for junk', () => {
    expect(patchesBehind('26.20', 'old')).toBeUndefined()
  })
})
