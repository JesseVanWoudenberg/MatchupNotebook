import { describe, expect, it } from 'vitest'
import { validateNotebook } from '@/schema'
import {
  AUTHOR_ID,
  T0,
  fakeEnv,
  makeNotebook,
  makeReview,
  makeRunePage,
  makeSkillOrder,
  makeTip,
} from '@/test/fixtures'
import {
  backupDocument,
  backupFileName,
  importChangeCount,
  planImport,
  shareDocument,
  shareFileName,
} from './sharing'

const OTHER_AUTHOR = '22222222-2222-4222-8222-222222222222'
const T1 = '2026-10-13T10:00:00.000Z'
const foreign = { type: 'mine' as const, authorId: OTHER_AUTHOR, authorName: 'Coach' }

const notebook = makeNotebook({
  profile: { authorId: AUTHOR_ID, authorName: 'Jesse' },
  favoriteChamps: ['Taliyah'],
  tips: [
    makeTip({ id: 'a0000000-0000-4000-8000-000000000001', scope: { myChamp: 'Taliyah' } }),
    makeTip({
      id: 'a0000000-0000-4000-8000-000000000002',
      scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
      origin: { type: 'mine', authorId: AUTHOR_ID, authorName: '' },
    }),
    makeTip({
      id: 'a0000000-0000-4000-8000-000000000003',
      scope: { myChamp: 'Taliyah', enemy: 'Zed' },
    }),
    makeTip({ id: 'a0000000-0000-4000-8000-000000000004', scope: { myChamp: 'Ahri' } }),
    makeTip({
      id: 'a0000000-0000-4000-8000-000000000005',
      scope: { enemy: 'Yasuo' },
      origin: { type: 'imported', authorId: OTHER_AUTHOR, authorName: 'Coach' },
    }),
  ],
  runePages: [makeRunePage({ scope: { myChamp: 'Taliyah', enemy: 'Yasuo' } })],
  skillOrders: [makeSkillOrder()],
  reviews: [makeReview()],
})

describe('shareDocument', () => {
  it('shares one matchup: champ-wide and that enemy, plus imported tips that fit', () => {
    const shared = shareDocument(notebook, {
      view: { myChamp: 'Taliyah', enemy: 'Yasuo' },
      includeRunePages: true,
      includeSkillOrders: false,
    })
    expect(shared.tips.map((tip) => tip.id.slice(-1)).sort()).toEqual(['1', '2', '5'])
    expect(shared.runePages).toHaveLength(1)
    expect(shared.skillOrders).toEqual([])
    expect(shared.reviews).toEqual([])
    expect(shared.favoriteChamps).toEqual([])
    expect(validateNotebook(shared).ok).toBe(true)
  })

  it('shares everything for a champ: every enemy, and enemy-only tips that fit', () => {
    const shared = shareDocument(notebook, {
      view: { myChamp: 'Taliyah' },
      includeRunePages: false,
      includeSkillOrders: true,
    })
    expect(shared.tips.map((tip) => tip.id.slice(-1)).sort()).toEqual(['1', '2', '3', '5'])
    expect(shared.skillOrders).toHaveLength(1)
  })

  it('stamps your current name on your items and leaves others alone', () => {
    const shared = shareDocument(notebook, {
      includeRunePages: false,
      includeSkillOrders: false,
    })
    expect(shared.tips).toHaveLength(5)
    expect(shared.tips[1]!.origin.authorName).toBe('Jesse')
    expect(shared.tips[4]!.origin.authorName).toBe('Coach')
    expect(notebook.tips[1]!.origin.authorName).toBe('')
  })

  it('names files after the slice', () => {
    const nameOf = (id: string) => (id === 'MonkeyKing' ? 'Wukong' : id)
    expect(shareFileName({ myChamp: 'MonkeyKing', enemy: 'KSante' }, nameOf)).toBe(
      'wukong-vs-ksante.json',
    )
    expect(shareFileName({ myChamp: 'Ahri' }, nameOf)).toBe('ahri.json')
    expect(shareFileName({ myChamp: 'Ahri', enemy: 'Zed', role: 'mid' }, nameOf)).toBe(
      'ahri-vs-zed-mid.json',
    )
    expect(shareFileName(undefined, nameOf)).toBe('matchup-notebook-share.json')
    expect(backupFileName(T0)).toBe('matchup-notebook-backup-2026-10-12.json')
  })

  it('backs up everything as is, as a copy', () => {
    const backup = backupDocument(notebook)
    expect(backup).toEqual(notebook)
    expect(backup).not.toBe(notebook)
  })
})

describe('planImport', () => {
  it('adds new items from someone else as imported with one pack id', () => {
    const incoming = makeNotebook({
      profile: { authorId: OTHER_AUTHOR, authorName: 'Coach' },
      tips: [makeTip({ id: 'b0000000-0000-4000-8000-000000000001', origin: foreign })],
      runePages: [makeRunePage({ id: 'b0000000-0000-4000-8000-000000000002', origin: foreign })],
    })
    const plan = planImport(notebook, incoming, fakeEnv())
    expect(plan.isOwnBackup).toBe(false)
    expect(plan.authorName).toBe('Coach')
    expect(plan.tips).toEqual({ added: 1, updated: 0, skipped: 0 })
    expect(plan.runePages).toEqual({ added: 1, updated: 0, skipped: 0 })
    const added = plan.result.tips.at(-1)!
    expect(added.origin).toEqual({ ...foreign, type: 'imported', packId: plan.packId })
    expect(plan.result.runePages.at(-1)!.origin.packId).toBe(plan.packId)
    expect(validateNotebook(plan.result).ok).toBe(true)
    expect(importChangeCount(plan)).toBe(2)
  })

  it('never overwrites yours, and replaces an imported item only with a newer copy', () => {
    const mineChanged = makeTip({
      id: notebook.tips[0]!.id,
      text: 'Changed elsewhere',
      updatedAt: T1,
    })
    const importedOlder = makeTip({
      id: notebook.tips[4]!.id,
      text: 'Older',
      origin: foreign,
      updatedAt: '2026-10-01T00:00:00.000Z',
    })
    const importedNewer = makeTip({
      id: notebook.tips[4]!.id,
      text: 'Newer',
      origin: foreign,
      updatedAt: T1,
    })

    const older = planImport(
      notebook,
      makeNotebook({ tips: [mineChanged, importedOlder] }),
      fakeEnv(),
    )
    expect(older.tips).toEqual({ added: 0, updated: 0, skipped: 2 })
    expect(older.result.tips[0]!.text).toBe(notebook.tips[0]!.text)

    const newer = planImport(notebook, makeNotebook({ tips: [importedNewer] }), fakeEnv())
    expect(newer.tips).toEqual({ added: 0, updated: 1, skipped: 0 })
    expect(newer.result.tips[4]!.text).toBe('Newer')
    expect(newer.result.tips[4]!.origin.type).toBe('imported')
  })

  it('keeps an existing pack id on a re-shared item', () => {
    const repacked = makeTip({
      id: 'b0000000-0000-4000-8000-000000000009',
      origin: { ...foreign, packId: '33333333-3333-4333-8333-333333333333' },
    })
    const plan = planImport(notebook, makeNotebook({ tips: [repacked] }), fakeEnv())
    expect(plan.result.tips.at(-1)!.origin.packId).toBe('33333333-3333-4333-8333-333333333333')
  })

  it('brings your own backup home: items stay yours, reviews and favorites merge', () => {
    const backup = makeNotebook({
      profile: notebook.profile,
      favoriteChamps: ['Taliyah', 'Ahri'],
      tips: [makeTip({ id: 'c0000000-0000-4000-8000-000000000001' })],
      reviews: [makeReview(), makeReview({ id: 'c0000000-0000-4000-8000-000000000002' })],
    })
    const plan = planImport(notebook, backup, fakeEnv())
    expect(plan.isOwnBackup).toBe(true)
    expect(plan.tips).toEqual({ added: 1, updated: 0, skipped: 0 })
    expect(plan.result.tips.at(-1)!.origin.type).toBe('mine')
    expect(plan.reviews).toEqual({ added: 1, updated: 0, skipped: 1 })
    expect(plan.favoriteChamps).toBe(1)
    expect(plan.result.favoriteChamps).toEqual(['Taliyah', 'Ahri'])
  })

  it('leaves other people’s reviews and favorites out', () => {
    const theirs = makeNotebook({
      profile: { authorId: OTHER_AUTHOR, authorName: 'Coach' },
      favoriteChamps: ['Zed'],
      reviews: [makeReview({ id: 'c0000000-0000-4000-8000-000000000003', origin: foreign })],
    })
    const plan = planImport(notebook, theirs, fakeEnv())
    expect(plan.reviews).toEqual({ added: 0, updated: 0, skipped: 1 })
    expect(plan.favoriteChamps).toBe(0)
    expect(plan.result.favoriteChamps).toEqual(['Taliyah'])
    expect(importChangeCount(plan)).toBe(0)
  })

  it('does not touch the notebook it was given', () => {
    const before = structuredClone(notebook)
    planImport(
      notebook,
      makeNotebook({
        tips: [makeTip({ id: 'c0000000-0000-4000-8000-000000000004', origin: foreign })],
      }),
      fakeEnv(),
    )
    expect(notebook).toEqual(before)
  })
})
