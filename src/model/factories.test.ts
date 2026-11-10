import { describe, expect, it } from 'vitest'
import { Notebook, Review, Tip } from '@/schema'
import { createEmptyNotebook, createProfile, createReview, createTip, touch } from './factories'
import { fakeEnv, profile, T0 } from '@/test/fixtures'

describe('factories', () => {
  it('creates a profile with only an id and an empty name', () => {
    const p = createProfile(fakeEnv())
    expect(Object.keys(p).sort()).toEqual(['authorId', 'authorName'])
    expect(p.authorName).toBe('')
  })
  it('creates an empty notebook that validates', () => {
    expect(Notebook.safeParse(createEmptyNotebook(profile)).success).toBe(true)
  })
  it('creates a tip that validates, stamped from the profile', () => {
    const tip = createTip(
      profile,
      { scope: { myChamp: 'Taliyah' }, kind: 'general', text: '  Farm safe.  ', patch: '26.20' },
      fakeEnv(),
    )
    expect(Tip.safeParse(tip).success).toBe(true)
    expect(tip.text).toBe('Farm safe.')
    expect(tip.origin).toEqual({ type: 'mine', authorId: profile.authorId, authorName: '' })
    expect(tip.createdAt).toBe(T0)
    expect(tip.updatedAt).toBe(T0)
    expect('reviewId' in tip).toBe(false)
  })
  it('creates a review that validates', () => {
    const r = createReview(
      profile,
      { scope: { myChamp: 'Taliyah', enemy: 'Yasuo' }, text: 'Went fine.', patch: '26.20' },
      fakeEnv(),
    )
    expect(Review.safeParse(r).success).toBe(true)
  })
  it('touch returns a copy with a new updatedAt', () => {
    const env = fakeEnv()
    const tip = createTip(
      profile,
      { scope: { myChamp: 'Taliyah' }, kind: 'general', text: 'a', patch: '26.20' },
      env,
    )
    const later = { ...env, now: () => '2026-10-13T00:00:00.000Z' }
    const edited = touch(tip, { text: 'b' }, later)
    expect(edited.text).toBe('b')
    expect(edited.updatedAt).toBe('2026-10-13T00:00:00.000Z')
    expect(tip.text).toBe('a')
    expect(tip.updatedAt).toBe(T0)
  })
})
