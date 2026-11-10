import { describe, expect, it } from 'vitest'
import { RunePage } from './runePage'
import { makeRunePage } from '@/test/fixtures'

describe('RunePage', () => {
  it('accepts a complete page', () => {
    expect(RunePage.safeParse(makeRunePage()).success).toBe(true)
  })
  it('requires myChamp in scope', () => {
    expect(RunePage.safeParse({ ...makeRunePage(), scope: { enemy: 'Yasuo' } }).success).toBe(false)
  })
  it('requires exactly nine perk ids', () => {
    const eight = makeRunePage().selectedPerkIds.slice(0, 8)
    expect(RunePage.safeParse(makeRunePage({ selectedPerkIds: eight })).success).toBe(false)
    expect(
      RunePage.safeParse(makeRunePage({ selectedPerkIds: [...eight, 5001, 5001] })).success,
    ).toBe(false)
  })
  it('rejects the same tree twice', () => {
    expect(RunePage.safeParse(makeRunePage({ subStyleId: 8200 })).success).toBe(false)
  })
  it('rejects non-integer ids', () => {
    expect(RunePage.safeParse(makeRunePage({ primaryStyleId: 8200.5 })).success).toBe(false)
  })
})
