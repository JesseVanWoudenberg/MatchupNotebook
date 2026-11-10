import { describe, expect, it } from 'vitest'
import { ChampId, Origin, Patch, Role, Timestamp, Uuid } from './primitives'
import { AUTHOR_ID } from '@/test/fixtures'

describe('ChampId', () => {
  it('accepts Riot string ids', () => {
    for (const id of ['MonkeyKing', 'KSante', 'Belveth', 'Nunu', 'RenataGlasc']) {
      expect(ChampId.safeParse(id).success).toBe(true)
    }
  })
  it('rejects display names and empty strings', () => {
    expect(ChampId.safeParse('Monkey King').success).toBe(false)
    expect(ChampId.safeParse("K'Sante").success).toBe(false)
    expect(ChampId.safeParse('').success).toBe(false)
  })
})

describe('Role', () => {
  it('has exactly the five lanes', () => {
    expect(Role.options).toEqual(['top', 'jungle', 'mid', 'bot', 'support'])
    expect(Role.safeParse('adc').success).toBe(false)
  })
})

describe('Patch', () => {
  it('accepts the player-facing form', () => {
    expect(Patch.safeParse('26.20').success).toBe(true)
    expect(Patch.safeParse('26.1').success).toBe(true)
  })
  it('rejects Data Dragon versions and junk', () => {
    expect(Patch.safeParse('16.20.1').success).toBe(false)
    expect(Patch.safeParse('26').success).toBe(false)
    expect(Patch.safeParse('26.S3.2').success).toBe(false)
  })
})

describe('Uuid and Timestamp', () => {
  it('accept well-formed values', () => {
    expect(Uuid.safeParse(AUTHOR_ID).success).toBe(true)
    expect(Timestamp.safeParse('2026-10-12T19:00:00.000Z').success).toBe(true)
  })
  it('reject malformed values', () => {
    expect(Uuid.safeParse('not-a-uuid').success).toBe(false)
    expect(Timestamp.safeParse('2026-10-12').success).toBe(false)
    expect(Timestamp.safeParse(1760295600000).success).toBe(false)
  })
})

describe('Origin', () => {
  it('accepts mine without a pack and imported with a pack', () => {
    expect(Origin.safeParse({ type: 'mine', authorId: AUTHOR_ID, authorName: '' }).success).toBe(
      true,
    )
    expect(
      Origin.safeParse({
        type: 'imported',
        authorId: AUTHOR_ID,
        authorName: 'Coach',
        packId: AUTHOR_ID,
      }).success,
    ).toBe(true)
  })
  it('rejects unknown keys, so no personal fields sneak in', () => {
    expect(
      Origin.safeParse({ type: 'mine', authorId: AUTHOR_ID, authorName: '', email: 'x@y.z' })
        .success,
    ).toBe(false)
  })
})
