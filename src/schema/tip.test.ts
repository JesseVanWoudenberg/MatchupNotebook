import { describe, expect, it } from 'vitest'
import { Tip, TipKind } from './tip'
import { makeTip } from '@/test/fixtures'

describe('Tip', () => {
  it('accepts a complete tip', () => {
    expect(Tip.safeParse(makeTip()).success).toBe(true)
  })
  it('trims text and rejects blank text', () => {
    const r = Tip.safeParse(makeTip({ text: '  hold W  ' }))
    expect(r.success && r.data.text).toBe('hold W')
    expect(Tip.safeParse(makeTip({ text: '   ' })).success).toBe(false)
  })
  it('rejects an unknown kind', () => {
    expect(Tip.safeParse({ ...makeTip(), kind: 'macro' }).success).toBe(false)
    expect(TipKind.options).toEqual(['setup', 'early', 'watch_out', 'win_con', 'general'])
  })
  it('rejects an empty scope', () => {
    expect(Tip.safeParse({ ...makeTip(), scope: {} }).success).toBe(false)
  })
  it('allows reviewId to be absent or a uuid', () => {
    expect(Tip.safeParse(makeTip()).success).toBe(true)
    expect(
      Tip.safeParse(makeTip({ reviewId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' })).success,
    ).toBe(true)
    expect(Tip.safeParse({ ...makeTip(), reviewId: 'nope' }).success).toBe(false)
  })
  it('rejects unknown top-level keys', () => {
    expect(Tip.safeParse({ ...makeTip(), apiKey: 'sk-123' }).success).toBe(false)
  })
  it('rejects visibility other than private, for now', () => {
    expect(Tip.safeParse({ ...makeTip(), visibility: 'public' }).success).toBe(false)
  })
})
