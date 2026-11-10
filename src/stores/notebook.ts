import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ChampId, Notebook, Profile, Review, RunePage, SkillOrder, Tip, Uuid } from '@/schema'
import {
  createEmptyNotebook,
  createProfile,
  createReview,
  createRunePage,
  createSkillOrder,
  createTip,
  defaultEnv,
  touch,
  type Env,
  type NewReviewInput,
  type NewRunePageInput,
  type NewSkillOrderInput,
  type NewTipInput,
} from '@/model/factories'
import { planImport as planNotebookImport, type ImportPlan } from '@/model/sharing'
import { PersistenceError, type NotebookStore } from '@/persistence'

const NO_SKILL_ORDER = 'No skill order with id '

/** Fields of a tip the user may change after creation. */
export type TipEdit = Partial<Pick<Tip, 'scope' | 'kind' | 'text' | 'patch'>>

/** Fields of a rune page the user may change after creation. */
export type RunePageEdit = Partial<
  Pick<RunePage, 'scope' | 'name' | 'primaryStyleId' | 'subStyleId' | 'selectedPerkIds' | 'patch'>
>

/** Fields of a skill order the user may change after creation. */
export type SkillOrderEdit = Partial<Pick<SkillOrder, 'scope' | 'name' | 'levels' | 'patch'>>

/** Fields of a review the user may change after creation. */
export type ReviewEdit = Partial<Pick<Review, 'scope' | 'text'>>

/**
 * In-memory truth for the notebook. Every change is written through to the
 * NotebookStore right away. Components talk to this store, never to
 * persistence directly.
 */
export const useNotebookStore = defineStore('notebook', () => {
  const notebook = ref<Notebook>()
  const loadError = ref<string>()
  let persistence: NotebookStore | undefined
  let env: Env = defaultEnv

  const isLoaded = computed(() => notebook.value !== undefined)
  const tips = computed<readonly Tip[]>(() => notebook.value?.tips ?? [])
  const reviews = computed<readonly Review[]>(() => notebook.value?.reviews ?? [])
  const runePages = computed<readonly RunePage[]>(() => notebook.value?.runePages ?? [])
  const skillOrders = computed<readonly SkillOrder[]>(() => notebook.value?.skillOrders ?? [])
  const profile = computed<Profile | undefined>(() => notebook.value?.profile)
  const favoriteChamps = computed<readonly ChampId[]>(() => notebook.value?.favoriteChamps ?? [])

  /**
   * Load from the given store, or start a fresh notebook when nothing is
   * saved yet. On a corrupt file the error is kept in `loadError` and the
   * notebook stays unloaded, so nothing can overwrite the file.
   */
  async function initialize(store: NotebookStore, environment: Env = defaultEnv): Promise<void> {
    persistence = store
    env = environment
    loadError.value = undefined
    try {
      const loaded = await store.load()
      if (loaded) {
        notebook.value = loaded
      } else {
        notebook.value = createEmptyNotebook(createProfile(env))
        await persist()
      }
    } catch (error: unknown) {
      notebook.value = undefined
      loadError.value =
        error instanceof PersistenceError ? error.message : describeUnknownError(error)
      throw error
    }
  }

  function requireNotebook(): Notebook {
    if (!notebook.value) throw new Error('The notebook is not loaded.')
    return notebook.value
  }

  async function persist(): Promise<void> {
    if (!persistence) throw new Error('The notebook store has no persistence yet.')
    await persistence.save(requireNotebook())
  }

  /** A fresh id from the same source the factories use. For drafts that need an id before saving. */
  function newId(): Uuid {
    return env.newId()
  }

  async function addTip(input: NewTipInput): Promise<Tip> {
    const current = requireNotebook()
    const tip = createTip(current.profile, input, env)
    current.tips.push(tip)
    await persist()
    return tip
  }

  async function updateTip(id: Uuid, edit: TipEdit): Promise<Tip> {
    const current = requireNotebook()
    const index = current.tips.findIndex((tip) => tip.id === id)
    if (index < 0) throw new Error(`No tip with id ${id}.`)
    const edited = touch(current.tips[index]!, edit, env)
    current.tips[index] = edited
    await persist()
    return edited
  }

  async function removeTip(id: Uuid): Promise<void> {
    const current = requireNotebook()
    const index = current.tips.findIndex((tip) => tip.id === id)
    if (index < 0) return
    current.tips.splice(index, 1)
    await persist()
  }

  function getReview(id: Uuid): Review | undefined {
    return reviews.value.find((review) => review.id === id)
  }

  async function addReview(input: NewReviewInput): Promise<Review> {
    const current = requireNotebook()
    const review = createReview(current.profile, input, env)
    current.reviews.push(review)
    await persist()
    return review
  }

  async function updateReview(id: Uuid, edit: ReviewEdit): Promise<Review> {
    const current = requireNotebook()
    const index = current.reviews.findIndex((review) => review.id === id)
    if (index < 0) throw new Error(`No review with id ${id}.`)
    const edited = touch(current.reviews[index]!, edit, env)
    current.reviews[index] = edited
    await persist()
    return edited
  }

  /** Removes the review only. Tips it produced stay, with a dangling link, by design. */
  async function removeReview(id: Uuid): Promise<void> {
    const current = requireNotebook()
    const index = current.reviews.findIndex((review) => review.id === id)
    if (index < 0) return
    current.reviews.splice(index, 1)
    await persist()
  }

  function getRunePage(id: Uuid): RunePage | undefined {
    return runePages.value.find((page) => page.id === id)
  }

  async function addRunePage(input: NewRunePageInput): Promise<RunePage> {
    const current = requireNotebook()
    const page = createRunePage(current.profile, input, env)
    current.runePages.push(page)
    await persist()
    return page
  }

  async function updateRunePage(id: Uuid, edit: RunePageEdit): Promise<RunePage> {
    const current = requireNotebook()
    const index = current.runePages.findIndex((page) => page.id === id)
    if (index < 0) throw new Error(`No rune page with id ${id}.`)
    const edited = touch(current.runePages[index]!, edit, env)
    current.runePages[index] = edited
    await persist()
    return edited
  }

  async function removeRunePage(id: Uuid): Promise<void> {
    const current = requireNotebook()
    const index = current.runePages.findIndex((page) => page.id === id)
    if (index < 0) return
    current.runePages.splice(index, 1)
    await persist()
  }

  function getSkillOrder(id: Uuid): SkillOrder | undefined {
    return skillOrders.value.find((order) => order.id === id)
  }

  async function addSkillOrder(input: NewSkillOrderInput): Promise<SkillOrder> {
    const current = requireNotebook()
    const order = createSkillOrder(current.profile, input, env)
    current.skillOrders.push(order)
    await persist()
    return order
  }

  async function updateSkillOrder(id: Uuid, edit: SkillOrderEdit): Promise<SkillOrder> {
    const current = requireNotebook()
    const index = current.skillOrders.findIndex((order) => order.id === id)
    if (index < 0) throw new Error(NO_SKILL_ORDER + id)
    const edited = touch(current.skillOrders[index]!, edit, env)
    current.skillOrders[index] = edited
    await persist()
    return edited
  }

  async function removeSkillOrder(id: Uuid): Promise<void> {
    const current = requireNotebook()
    const index = current.skillOrders.findIndex((order) => order.id === id)
    if (index < 0) return
    current.skillOrders.splice(index, 1)
    await persist()
  }

  function isFavorite(champId: ChampId): boolean {
    return favoriteChamps.value.includes(champId)
  }

  /** Adds the champ to your pool, or removes it when already there. */
  async function toggleFavorite(champId: ChampId): Promise<void> {
    const current = requireNotebook()
    const index = current.favoriteChamps.indexOf(champId)
    if (index < 0) current.favoriteChamps.push(champId)
    else current.favoriteChamps.splice(index, 1)
    await persist()
  }

  /** The name others see on tips you share. Stamped on exports, not on stored items. */
  async function setAuthorName(name: string): Promise<void> {
    const current = requireNotebook()
    current.profile = { ...current.profile, authorName: name.trim() }
    await persist()
  }

  /** What importing a file would change. Nothing is written. */
  function planImport(incoming: Notebook): ImportPlan {
    return planNotebookImport(requireNotebook(), incoming, env)
  }

  /** Keeps a plan from `planImport`. The merged notebook replaces the current one. */
  async function applyImport(plan: ImportPlan): Promise<void> {
    requireNotebook()
    notebook.value = plan.result
    await persist()
  }

  return {
    notebook,
    loadError,
    isLoaded,
    tips,
    reviews,
    runePages,
    skillOrders,
    profile,
    favoriteChamps,
    initialize,
    newId,
    addTip,
    updateTip,
    removeTip,
    getReview,
    addReview,
    updateReview,
    removeReview,
    getRunePage,
    addRunePage,
    updateRunePage,
    removeRunePage,
    getSkillOrder,
    addSkillOrder,
    updateSkillOrder,
    removeSkillOrder,
    isFavorite,
    toggleFavorite,
    setAuthorName,
    planImport,
    applyImport,
  }
})

/** Anything that is not a PersistenceError, with its detail, so the cause is not lost. */
function describeUnknownError(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error)
  return `Could not read your notebook. ${detail}`
}
