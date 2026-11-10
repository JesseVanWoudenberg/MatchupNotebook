import type { Env } from '@/model/factories'
import {
  SCHEMA_VERSION,
  type Notebook,
  type Profile,
  type Review,
  type RunePage,
  type SkillOrder,
  type Tip,
} from '@/schema'

export const AUTHOR_ID = '11111111-1111-4111-8111-111111111111'
export const T0 = '2026-10-12T19:00:00.000Z'

export const profile: Profile = { authorId: AUTHOR_ID, authorName: '' }

/** Deterministic env: fixed clock, counting uuids. */
export function fakeEnv(): Env {
  let n = 0
  return {
    now: () => T0,
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  }
}

export function makeTip(overrides: Partial<Tip> = {}): Tip {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
    kind: 'early',
    text: 'Hold W for his dash.',
    patch: '26.20',
    origin: { type: 'mine', authorId: AUTHOR_ID, authorName: '' },
    visibility: 'private',
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  }
}

export function makeRunePage(overrides: Partial<RunePage> = {}): RunePage {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    scope: { myChamp: 'Taliyah' },
    name: 'Taliyah default',
    primaryStyleId: 8200,
    subStyleId: 8300,
    selectedPerkIds: [8229, 8226, 8210, 8237, 8345, 8347, 5008, 5008, 5001],
    patch: '26.20',
    origin: { type: 'mine', authorId: AUTHOR_ID, authorName: '' },
    visibility: 'private',
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  }
}

export function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' },
    text: 'Lost lane early, won late by roaming.',
    patch: '26.20',
    origin: { type: 'mine', authorId: AUTHOR_ID, authorName: '' },
    visibility: 'private',
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  }
}

export function makeSkillOrder(overrides: Partial<SkillOrder> = {}): SkillOrder {
  return {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    scope: { myChamp: 'Taliyah' },
    name: 'Standard',
    levels: [
      'Q',
      'W',
      'E',
      'Q',
      'Q',
      'R',
      'Q',
      'W',
      'Q',
      'W',
      'R',
      'W',
      'W',
      'E',
      'E',
      'R',
      'E',
      'E',
    ],
    patch: '26.20',
    origin: { type: 'mine', authorId: AUTHOR_ID, authorName: '' },
    visibility: 'private',
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  }
}

export function makeNotebook(overrides: Partial<Notebook> = {}): Notebook {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile,
    favoriteChamps: [],
    tips: [],
    runePages: [],
    skillOrders: [],
    reviews: [],
    ...overrides,
  }
}
