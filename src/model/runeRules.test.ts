import { describe, expect, it } from 'vitest'
import { loadBundledRunes } from '@/data/runes'
import {
  emptyRuneSelection,
  isRuneSelectionValid,
  perkById,
  rowOfPerk,
  styleById,
  validateRuneSelection,
  type RuneSelection,
} from './runeRules'

const snapshot = loadBundledRunes()
const sorcery = styleById(snapshot, 8200)!
const resolve = styleById(snapshot, 8400)!

/** A real Taliyah page: Sorcery primary, Resolve secondary. */
function validPage(): RuneSelection {
  return {
    primaryStyleId: 8200,
    subStyleId: 8400,
    selectedPerkIds: [
      sorcery.slots[0]![0]!.id,
      sorcery.slots[1]![0]!.id,
      sorcery.slots[2]![0]!.id,
      sorcery.slots[3]![0]!.id,
      resolve.slots[1]![0]!.id,
      resolve.slots[3]![0]!.id,
      5008,
      5010,
      5001,
    ],
  }
}

describe('validateRuneSelection', () => {
  it('accepts a complete, legal page', () => {
    expect(validateRuneSelection(validPage(), snapshot)).toEqual([])
    expect(isRuneSelectionValid(validPage(), snapshot)).toBe(true)
  })

  it('flags every empty slot on an empty page', () => {
    const issues = validateRuneSelection(emptyRuneSelection(), snapshot)
    expect(issues.map((issue) => issue.target)).toEqual([
      'primaryStyle',
      'subStyle',
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
    ])
  })

  it('rejects the same tree twice', () => {
    const page = { ...validPage(), subStyleId: 8200 }
    expect(validateRuneSelection(page, snapshot).some((i) => i.target === 'subStyle')).toBe(true)
  })

  it('rejects a primary rune from the wrong row', () => {
    const page = validPage()
    page.selectedPerkIds[1] = sorcery.slots[2]![0]!.id
    expect(validateRuneSelection(page, snapshot)).toEqual([
      { target: 1, message: 'This rune is not in this row anymore.' },
    ])
  })

  it('rejects a keystone as a secondary rune', () => {
    const page = validPage()
    page.selectedPerkIds[4] = resolve.slots[0]![0]!.id
    expect(validateRuneSelection(page, snapshot).map((i) => i.target)).toEqual([4])
  })

  it('rejects two secondary runes from the same row', () => {
    const page = validPage()
    page.selectedPerkIds[5] = resolve.slots[1]![1]!.id
    expect(validateRuneSelection(page, snapshot)).toEqual([
      { target: 5, message: 'Secondary runes must come from different rows.' },
    ])
  })

  it('rejects a shard in the wrong row', () => {
    const page = validPage()
    page.selectedPerkIds[6] = 5011
    expect(validateRuneSelection(page, snapshot).map((i) => i.target)).toEqual([6])
  })

  it('flags a rune that no longer exists, which is how "needs update" is detected', () => {
    const page = validPage()
    page.selectedPerkIds[2] = 9999
    expect(validateRuneSelection(page, snapshot).map((i) => i.target)).toEqual([2])
  })
})

describe('lookups', () => {
  it('finds perks and rows', () => {
    const keystone = sorcery.slots[0]![0]!
    expect(perkById(snapshot, keystone.id)).toEqual(keystone)
    expect(rowOfPerk(sorcery, keystone.id)).toBe(0)
    expect(rowOfPerk(resolve, keystone.id)).toBeUndefined()
    expect(perkById(snapshot, 1)).toBeUndefined()
  })
})
