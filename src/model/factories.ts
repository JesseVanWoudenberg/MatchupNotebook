import {
  SCHEMA_VERSION,
  type MatchupScope,
  type Notebook,
  type Origin,
  type Patch,
  type Profile,
  type Review,
  type RunePage,
  type SkillOrder,
  type Ability,
  type Timestamp,
  type Tip,
  type TipKind,
  type TipScope,
  type Uuid,
} from '@/schema'

/** Injectable clock and id source so tests stay deterministic. */
export interface Env {
  now(): Timestamp
  newId(): Uuid
}

export const defaultEnv: Env = {
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
}

export function createProfile(env: Env = defaultEnv): Profile {
  return { authorId: env.newId(), authorName: '' }
}

export function createEmptyNotebook(profile: Profile): Notebook {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile,
    favoriteChamps: [],
    tips: [],
    runePages: [],
    skillOrders: [],
    reviews: [],
  }
}

/** Origin for something you wrote yourself, stamped from the local profile. */
export function mineOrigin(profile: Profile): Origin {
  return { type: 'mine', authorId: profile.authorId, authorName: profile.authorName }
}

export interface NewTipInput {
  scope: TipScope
  kind: TipKind
  text: string
  patch: Patch
  reviewId?: Uuid
}

export function createTip(profile: Profile, input: NewTipInput, env: Env = defaultEnv): Tip {
  const at = env.now()
  const tip: Tip = {
    id: env.newId(),
    scope: input.scope,
    kind: input.kind,
    text: input.text.trim(),
    patch: input.patch,
    origin: mineOrigin(profile),
    visibility: 'private',
    createdAt: at,
    updatedAt: at,
  }
  if (input.reviewId !== undefined) tip.reviewId = input.reviewId
  return tip
}

export interface NewRunePageInput {
  scope: MatchupScope
  name: string
  primaryStyleId: number
  subStyleId: number
  selectedPerkIds: number[]
  patch: Patch
}

export function createRunePage(
  profile: Profile,
  input: NewRunePageInput,
  env: Env = defaultEnv,
): RunePage {
  const at = env.now()
  return {
    id: env.newId(),
    scope: input.scope,
    name: input.name.trim(),
    primaryStyleId: input.primaryStyleId,
    subStyleId: input.subStyleId,
    selectedPerkIds: [...input.selectedPerkIds],
    patch: input.patch,
    origin: mineOrigin(profile),
    visibility: 'private',
    createdAt: at,
    updatedAt: at,
  }
}

export interface NewSkillOrderInput {
  scope: MatchupScope
  name: string
  levels: Ability[]
  patch: Patch
}

export function createSkillOrder(
  profile: Profile,
  input: NewSkillOrderInput,
  env: Env = defaultEnv,
): SkillOrder {
  const at = env.now()
  return {
    id: env.newId(),
    scope: input.scope,
    name: input.name.trim(),
    levels: [...input.levels],
    patch: input.patch,
    origin: mineOrigin(profile),
    visibility: 'private',
    createdAt: at,
    updatedAt: at,
  }
}

export interface NewReviewInput {
  scope: MatchupScope
  text: string
  patch: Patch
  /** Pre-generated id, so tips written during the review can link to it before it is saved. */
  id?: Uuid
}

export function createReview(
  profile: Profile,
  input: NewReviewInput,
  env: Env = defaultEnv,
): Review {
  const at = env.now()
  return {
    id: input.id ?? env.newId(),
    scope: input.scope,
    text: input.text.trim(),
    patch: input.patch,
    origin: mineOrigin(profile),
    visibility: 'private',
    createdAt: at,
    updatedAt: at,
  }
}

/** Returns a copy with the patch applied and updatedAt bumped. Never mutates. */
export function touch<T extends { updatedAt: Timestamp }>(
  item: T,
  patch: Partial<NoInfer<T>>,
  env: Env = defaultEnv,
): T {
  return { ...item, ...patch, updatedAt: env.now() }
}
