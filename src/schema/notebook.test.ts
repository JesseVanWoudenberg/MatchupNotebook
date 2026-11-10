import { describe, expect, it } from 'vitest'
import { Notebook, SCHEMA_VERSION, readSchemaVersion, validateNotebook } from './notebook'
import { makeNotebook, makeReview, makeRunePage, makeTip } from '@/test/fixtures'

/** Validates and returns the failure result, or throws when it unexpectedly passed. */
function invalid(data: unknown) {
  const result = validateNotebook(data)
  if (result.ok) throw new Error('Expected validation to fail')
  return result
}

describe('Notebook', () => {
  it('accepts an empty notebook', () => {
    expect(validateNotebook(makeNotebook()).ok).toBe(true)
  })
  it('accepts a notebook with one of everything', () => {
    const notebook = makeNotebook({
      tips: [makeTip({ reviewId: makeReview().id })],
      runePages: [makeRunePage()],
      reviews: [makeReview()],
    })
    expect(validateNotebook(notebook).ok).toBe(true)
  })
  it('allows a dangling reviewId, since share exports drop reviews', () => {
    const notebook = makeNotebook({ tips: [makeTip({ reviewId: makeReview().id })] })
    expect(validateNotebook(notebook).ok).toBe(true)
  })
  it('rejects duplicate ids within a collection', () => {
    const result = invalid(makeNotebook({ tips: [makeTip(), makeTip()] }))
    expect(result.error).toMatch(/Duplicate id/)
  })
  it('rejects the wrong schemaVersion', () => {
    expect(validateNotebook({ ...makeNotebook(), schemaVersion: SCHEMA_VERSION + 1 }).ok).toBe(
      false,
    )
  })
  it('rejects a profile with extra personal fields', () => {
    const notebook = {
      ...makeNotebook(),
      profile: { ...makeNotebook().profile, email: 'a@b.c' },
    }
    expect(Notebook.safeParse(notebook).success).toBe(false)
  })
  it('never throws on junk and gives a readable error', () => {
    for (const junk of [null, 42, 'x', [], {}, { schemaVersion: '1' }]) {
      expect(invalid(junk).error.length).toBeGreaterThan(0)
    }
  })
  it('points at the broken item in the error', () => {
    const result = invalid(makeNotebook({ tips: [makeTip(), makeTip({ text: '' })] }))
    expect(result.issues[0]?.path).toEqual(['tips', 1, 'text'])
  })
})

describe('readSchemaVersion', () => {
  it('reads a numeric version', () => {
    expect(readSchemaVersion({ schemaVersion: 1 })).toBe(1)
    expect(readSchemaVersion({ schemaVersion: 7, whatever: true })).toBe(7)
  })
  it('returns undefined otherwise', () => {
    expect(readSchemaVersion(null)).toBeUndefined()
    expect(readSchemaVersion({})).toBeUndefined()
    expect(readSchemaVersion({ schemaVersion: '1' })).toBeUndefined()
  })
})
