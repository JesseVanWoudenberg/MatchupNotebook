import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotebookStore } from './notebook'
import { MemoryNotebookStore } from '@/persistence'
import { fakeEnv, makeNotebook, makeSkillOrder, makeTip } from '@/test/fixtures'

const TALIYAH_GENERAL = {
  scope: { myChamp: 'Taliyah' },
  kind: 'general',
  text: 'Farm safe.',
  patch: '26.20',
} as const

describe('useNotebookStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts a fresh notebook when nothing is saved, and saves it', async () => {
    const persistence = new MemoryNotebookStore()
    const store = useNotebookStore()
    await store.initialize(persistence, fakeEnv())

    expect(store.isLoaded).toBe(true)
    expect(store.tips).toEqual([])
    expect(store.profile?.authorId).toBe('00000000-0000-4000-8000-000000000001')
    expect(await persistence.load()).toEqual(store.notebook)
  })

  it('loads an existing notebook', async () => {
    const existing = makeNotebook({ tips: [makeTip()] })
    const store = useNotebookStore()
    await store.initialize(new MemoryNotebookStore(existing), fakeEnv())
    expect(store.tips).toEqual(existing.tips)
  })

  it('keeps a corrupt file untouched and exposes the error', async () => {
    const persistence = new MemoryNotebookStore('{ broken')
    const store = useNotebookStore()
    await expect(store.initialize(persistence, fakeEnv())).rejects.toThrow()

    expect(store.isLoaded).toBe(false)
    expect(store.loadError).toMatch(/could not be read/)
    expect(persistence.peekText()).toBe('{ broken')
    await expect(store.addTip(TALIYAH_GENERAL)).rejects.toThrow(/not loaded/)
  })

  it('adds a tip stamped from the profile and persists it', async () => {
    const persistence = new MemoryNotebookStore()
    const store = useNotebookStore()
    await store.initialize(persistence, fakeEnv())

    const tip = await store.addTip(TALIYAH_GENERAL)
    expect(store.tips).toEqual([tip])
    expect(tip.origin.authorId).toBe(store.profile?.authorId)
    expect((await persistence.load())?.tips).toEqual([tip])
  })

  it('updates a tip and bumps updatedAt', async () => {
    const env = fakeEnv()
    const persistence = new MemoryNotebookStore()
    const store = useNotebookStore()
    await store.initialize(persistence, env)
    const tip = await store.addTip(TALIYAH_GENERAL)

    env.now = () => '2026-10-13T10:00:00.000Z'
    const edited = await store.updateTip(tip.id, { text: 'Farm safer.' })

    expect(edited.text).toBe('Farm safer.')
    expect(edited.updatedAt).toBe('2026-10-13T10:00:00.000Z')
    expect(edited.createdAt).toBe(tip.createdAt)
    expect((await persistence.load())?.tips[0]?.text).toBe('Farm safer.')
  })

  it('rejects updating a tip that does not exist', async () => {
    const store = useNotebookStore()
    await store.initialize(new MemoryNotebookStore(), fakeEnv())
    await expect(store.updateTip(makeTip().id, { text: 'x' })).rejects.toThrow(/No tip/)
  })

  it('removes a tip and persists the removal', async () => {
    const persistence = new MemoryNotebookStore()
    const store = useNotebookStore()
    await store.initialize(persistence, fakeEnv())
    const tip = await store.addTip(TALIYAH_GENERAL)

    await store.removeTip(tip.id)
    expect(store.tips).toEqual([])
    expect((await persistence.load())?.tips).toEqual([])
  })
})

describe('favorites', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('toggles a champ in and out of the pool and persists it', async () => {
    const persistence = new MemoryNotebookStore()
    const store = useNotebookStore()
    await store.initialize(persistence, fakeEnv())

    await store.toggleFavorite('Taliyah')
    await store.toggleFavorite('Yasuo')
    expect(store.favoriteChamps).toEqual(['Taliyah', 'Yasuo'])
    expect(store.isFavorite('Taliyah')).toBe(true)
    expect((await persistence.load())?.favoriteChamps).toEqual(['Taliyah', 'Yasuo'])

    await store.toggleFavorite('Taliyah')
    expect(store.favoriteChamps).toEqual(['Yasuo'])
    expect(store.isFavorite('Taliyah')).toBe(false)
  })
})

describe('reviews', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const TALIYAH_VS_YASUO = {
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
    patch: '26.20',
  } as const

  it('adds a review with a pre-generated id and links tips to it', async () => {
    const persistence = new MemoryNotebookStore()
    const store = useNotebookStore()
    await store.initialize(persistence, fakeEnv())

    const draftId = store.newId()
    const tip = await store.addTip({ ...TALIYAH_GENERAL, reviewId: draftId })
    const review = await store.addReview({
      ...TALIYAH_VS_YASUO,
      id: draftId,
      text: 'Lost early, won late.',
    })

    expect(review.id).toBe(draftId)
    expect(tip.reviewId).toBe(draftId)
    expect(store.getReview(draftId)).toEqual(review)
    expect((await persistence.load())?.reviews).toEqual([review])
  })

  it('updates and removes a review, leaving linked tips in place', async () => {
    const persistence = new MemoryNotebookStore()
    const store = useNotebookStore()
    await store.initialize(persistence, fakeEnv())
    const review = await store.addReview({ ...TALIYAH_VS_YASUO, text: 'First take.' })
    await store.addTip({ ...TALIYAH_GENERAL, reviewId: review.id })

    const edited = await store.updateReview(review.id, { text: 'Second take.' })
    expect(edited.text).toBe('Second take.')

    await store.removeReview(review.id)
    expect(store.reviews).toEqual([])
    expect(store.tips[0]?.reviewId).toBe(review.id)
    expect((await persistence.load())?.tips[0]?.reviewId).toBe(review.id)
  })
})

describe('rune pages', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const PAGE = {
    scope: { myChamp: 'Taliyah' },
    name: 'Taliyah default',
    primaryStyleId: 8200,
    subStyleId: 8400,
    selectedPerkIds: [8214, 8275, 8210, 8237, 8473, 8451, 5008, 5010, 5001],
    patch: '26.20',
  } as const

  it('adds, updates and removes a page with persistence', async () => {
    const persistence = new MemoryNotebookStore()
    const store = useNotebookStore()
    await store.initialize(persistence, fakeEnv())

    const page = await store.addRunePage({ ...PAGE, selectedPerkIds: [...PAGE.selectedPerkIds] })
    expect(store.runePages).toEqual([page])
    expect(store.getRunePage(page.id)).toEqual(page)
    expect((await persistence.load())?.runePages).toEqual([page])

    const edited = await store.updateRunePage(page.id, { name: 'Taliyah vs melee' })
    expect(edited.name).toBe('Taliyah vs melee')

    await store.removeRunePage(page.id)
    expect(store.runePages).toEqual([])
  })
})

describe('skill orders', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds, updates and removes a skill order with persistence', async () => {
    const persistence = new MemoryNotebookStore()
    const store = useNotebookStore()
    await store.initialize(persistence, fakeEnv())

    const order = await store.addSkillOrder({
      scope: { myChamp: 'Taliyah' },
      name: 'Standard',
      levels: makeSkillOrder().levels,
      patch: '26.20',
    })
    expect(store.skillOrders).toEqual([order])
    expect((await persistence.load())?.skillOrders).toEqual([order])

    const edited = await store.updateSkillOrder(order.id, { name: 'Vs melee' })
    expect(edited.name).toBe('Vs melee')
    await expect(store.updateSkillOrder(makeSkillOrder().id, { name: 'x' })).rejects.toThrow(
      /No skill order/,
    )

    await store.removeSkillOrder(order.id)
    expect(store.skillOrders).toEqual([])
  })
})
