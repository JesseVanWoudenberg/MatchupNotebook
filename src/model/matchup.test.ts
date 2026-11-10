import { describe, expect, it } from 'vitest'
import type { Tip } from '@/schema'
import {
  NO_FILTERS,
  applyTipFilters,
  groupTipsByTier,
  isMine,
  isOlderThan,
  tipFitsScope,
  tipsForScope,
} from './matchup'
import { makeTip } from '@/test/fixtures'

const taliyah = makeTip({
  id: '00000000-0000-4000-8000-000000000001',
  scope: { myChamp: 'Taliyah' },
})
const vsYasuo = makeTip({ id: '00000000-0000-4000-8000-000000000002', scope: { enemy: 'Yasuo' } })
const yasuoTop = makeTip({
  id: '00000000-0000-4000-8000-000000000003',
  scope: { enemy: 'Yasuo', role: 'top' },
})
const taliyahVsYasuo = makeTip({
  id: '00000000-0000-4000-8000-000000000004',
  scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
})
const taliyahVsYasuoMid = makeTip({
  id: '00000000-0000-4000-8000-000000000005',
  scope: { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' },
})
const taliyahVsZed = makeTip({
  id: '00000000-0000-4000-8000-000000000006',
  scope: { myChamp: 'Taliyah', enemy: 'Zed' },
})
const all: Tip[] = [taliyah, vsYasuo, yasuoTop, taliyahVsYasuo, taliyahVsYasuoMid, taliyahVsZed]

const ids = (tips: Tip[]) => tips.map((tip) => tip.id.slice(-1))

describe('tipFitsScope', () => {
  it('Taliyah vs Yasuo mid gathers every tip that fits', () => {
    const view = { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' } as const
    expect(all.filter((tip) => tipFitsScope(tip, view))).toEqual([
      taliyah,
      vsYasuo,
      taliyahVsYasuo,
      taliyahVsYasuoMid,
    ])
  })
  it('a role in the view hides tips for another role', () => {
    expect(tipFitsScope(yasuoTop, { enemy: 'Yasuo', role: 'mid' })).toBe(false)
    expect(tipFitsScope(yasuoTop, { enemy: 'Yasuo', role: 'top' })).toBe(true)
  })
  it('no role in the view shows tips for every role', () => {
    expect(tipFitsScope(taliyahVsYasuoMid, { myChamp: 'Taliyah', enemy: 'Yasuo' })).toBe(true)
    expect(tipFitsScope(yasuoTop, { enemy: 'Yasuo' })).toBe(true)
  })
  it('no enemy in the view shows only tips without an enemy', () => {
    const view = { myChamp: 'Taliyah' } as const
    expect(all.filter((tip) => tipFitsScope(tip, view))).toEqual([taliyah])
  })
  it('a lane-only tip shows only when that lane is selected', () => {
    const jungleOnly = makeTip({
      id: '00000000-0000-4000-8000-000000000007',
      scope: { role: 'jungle' },
    })
    expect(tipFitsScope(jungleOnly, { myChamp: 'Ahri' })).toBe(false)
    expect(tipFitsScope(jungleOnly, { myChamp: 'LeeSin', role: 'jungle' })).toBe(true)
    expect(tipFitsScope(jungleOnly, { myChamp: 'Ahri', role: 'mid' })).toBe(false)
    expect(tipFitsScope(jungleOnly, {})).toBe(false)
    expect(tipFitsScope(jungleOnly, { role: 'jungle' })).toBe(true)
  })
})

describe('tipsForScope', () => {
  it('sorts most specific first', () => {
    const sorted = tipsForScope(all, { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' })
    expect(ids(sorted)).toEqual(['5', '4', '1', '2'])
  })
  it('breaks ties by most recently updated', () => {
    const older = makeTip({
      id: taliyah.id,
      scope: { myChamp: 'Taliyah' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const newer = makeTip({
      id: vsYasuo.id,
      scope: { enemy: 'Yasuo' },
      updatedAt: '2026-06-01T00:00:00.000Z',
    })
    const sorted = tipsForScope([older, newer], { myChamp: 'Taliyah', enemy: 'Yasuo' })
    expect(sorted).toEqual([newer, older])
  })
})

describe('groupTipsByTier', () => {
  it('groups sorted tips into tiers, most specific first', () => {
    const sorted = tipsForScope(all, { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' })
    const tiers = groupTipsByTier(sorted)
    expect(tiers.map((tier) => tier.specificity)).toEqual([3, 2, 1])
    expect(ids(tiers[2]!.tips)).toEqual(['1', '2'])
  })
  it('returns no tiers for no tips', () => {
    expect(groupTipsByTier([])).toEqual([])
  })
})

describe('isMine', () => {
  it('is true for your own tips only', () => {
    expect(isMine(makeTip())).toBe(true)
    expect(
      isMine(
        makeTip({
          origin: { type: 'imported', authorId: makeTip().origin.authorId, authorName: 'Coach' },
        }),
      ),
    ).toBe(false)
  })
})

describe('isOlderThan', () => {
  const known = ['26.20', '26.19', '26.18', '26.17', '26.16']
  it('compares by position in the known patch list', () => {
    expect(isOlderThan(makeTip({ patch: '26.18' }), 2, '26.20', known)).toBe(false)
    expect(isOlderThan(makeTip({ patch: '26.17' }), 2, '26.20', known)).toBe(true)
  })
  it('treats an unknown patch as old', () => {
    expect(isOlderThan(makeTip({ patch: '24.1' }), 2, '26.20', known)).toBe(true)
  })
})

describe('applyTipFilters', () => {
  const mine = makeTip({ id: '00000000-0000-4000-8000-000000000011', patch: '26.20' })
  const imported = makeTip({
    id: '00000000-0000-4000-8000-000000000012',
    patch: '26.20',
    origin: { type: 'imported', authorId: makeTip().origin.authorId, authorName: 'Coach' },
  })
  const old = makeTip({ id: '00000000-0000-4000-8000-000000000013', patch: '26.10' })

  it('passes everything through with no filters', () => {
    expect(applyTipFilters([mine, imported, old], NO_FILTERS, '26.20')).toEqual([
      mine,
      imported,
      old,
    ])
  })
  it('keeps only your own tips', () => {
    expect(applyTipFilters([mine, imported, old], { onlyMine: true }, '26.20')).toEqual([mine, old])
  })
  it('hides tips older than the given number of patches', () => {
    const filters = { onlyMine: false, hideOlderThan: 5 }
    expect(applyTipFilters([mine, imported, old], filters, '26.20')).toEqual([mine, imported])
  })
  it('does not hide by age when the current patch is unknown', () => {
    const filters = { onlyMine: false, hideOlderThan: 5 }
    expect(applyTipFilters([mine, old], filters, undefined)).toEqual([mine, old])
  })
})

describe('includeNarrower', () => {
  it('lets a champ page list its matchup-specific tips, but never other champs', () => {
    const view = { myChamp: 'Taliyah' } as const
    const ahri = makeTip({ id: '00000000-0000-4000-8000-000000000008', scope: { myChamp: 'Ahri' } })
    const shown = [...all, ahri].filter((tip) => tipFitsScope(tip, view, { includeNarrower: true }))
    expect(ids(shown)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(shown).not.toContain(ahri)
  })
  it('does not change a view that already has an enemy', () => {
    const view = { myChamp: 'Taliyah', enemy: 'Yasuo' } as const
    expect(all.filter((tip) => tipFitsScope(tip, view, { includeNarrower: true }))).toEqual(
      all.filter((tip) => tipFitsScope(tip, view)),
    )
  })
})
