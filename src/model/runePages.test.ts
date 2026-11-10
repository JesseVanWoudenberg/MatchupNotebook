import { describe, expect, it } from 'vitest'
import { loadBundledRunes } from '@/data/runes'
import { bestRunePageForView, runePageNeedsUpdate, runePagesForView } from './runePages'
import { makeRunePage } from '@/test/fixtures'

const general = makeRunePage({ id: '00000000-0000-4000-8000-000000000041' })
const vsYasuo = makeRunePage({
  id: '00000000-0000-4000-8000-000000000042',
  scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
})
const vsYasuoMid = makeRunePage({
  id: '00000000-0000-4000-8000-000000000043',
  scope: { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' },
})
const ahri = makeRunePage({
  id: '00000000-0000-4000-8000-000000000044',
  scope: { myChamp: 'Ahri' },
})
const all = [general, vsYasuo, vsYasuoMid, ahri]

describe('runePagesForView and bestRunePageForView', () => {
  it('shows the most specific fitting page first', () => {
    const view = { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' } as const
    expect(runePagesForView(all, view)).toEqual([vsYasuoMid, vsYasuo, general])
    expect(bestRunePageForView(all, view)).toBe(vsYasuoMid)
  })
  it('falls back to the champ default without an enemy', () => {
    expect(bestRunePageForView(all, { myChamp: 'Taliyah' })).toBe(general)
  })
  it('gives nothing for a champ without pages', () => {
    expect(bestRunePageForView(all, { myChamp: 'Zed' })).toBeUndefined()
  })
})

describe('runePageNeedsUpdate', () => {
  const snapshot = loadBundledRunes()
  it('is false for a page the current data accepts', () => {
    const sorcery = snapshot.styles.find((s) => s.id === 8200)!
    const resolve = snapshot.styles.find((s) => s.id === 8400)!
    const page = makeRunePage({
      subStyleId: 8400,
      selectedPerkIds: [
        sorcery.slots[0]![0]!.id,
        sorcery.slots[1]![0]!.id,
        sorcery.slots[2]![0]!.id,
        sorcery.slots[3]![0]!.id,
        resolve.slots[1]![0]!.id,
        resolve.slots[2]![0]!.id,
        5008,
        5010,
        5001,
      ],
    })
    expect(runePageNeedsUpdate(page, snapshot)).toBe(false)
  })
  it('is true when a rune id is gone', () => {
    expect(
      runePageNeedsUpdate(makeRunePage({ selectedPerkIds: [1, 2, 3, 4, 5, 6, 7, 8, 9] }), snapshot),
    ).toBe(true)
  })
})
