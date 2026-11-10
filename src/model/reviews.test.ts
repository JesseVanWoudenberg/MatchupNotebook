import { describe, expect, it } from 'vitest'
import { reviewFitsView, reviewsForView, tipsFromReview } from './reviews'
import { makeReview, makeTip } from '@/test/fixtures'

const taliyahVsYasuoMid = makeReview()
const taliyahVsZed = makeReview({
  id: '00000000-0000-4000-8000-000000000021',
  scope: { myChamp: 'Taliyah', enemy: 'Zed' },
  createdAt: '2026-10-01T00:00:00.000Z',
})
const ahriVsYasuo = makeReview({
  id: '00000000-0000-4000-8000-000000000022',
  scope: { myChamp: 'Ahri', enemy: 'Yasuo' },
})

describe('reviewFitsView', () => {
  it('requires your champ', () => {
    expect(reviewFitsView(taliyahVsYasuoMid, { myChamp: 'Taliyah' })).toBe(true)
    expect(reviewFitsView(taliyahVsYasuoMid, { myChamp: 'Ahri' })).toBe(false)
    expect(reviewFitsView(taliyahVsYasuoMid, {})).toBe(false)
  })
  it('requires the enemy when the view has one', () => {
    expect(reviewFitsView(taliyahVsZed, { myChamp: 'Taliyah', enemy: 'Yasuo' })).toBe(false)
    expect(reviewFitsView(taliyahVsZed, { myChamp: 'Taliyah', enemy: 'Zed' })).toBe(true)
  })
  it('lets a review without a lane through a lane view, but not a different lane', () => {
    expect(reviewFitsView(taliyahVsZed, { myChamp: 'Taliyah', role: 'mid' })).toBe(true)
    expect(reviewFitsView(taliyahVsYasuoMid, { myChamp: 'Taliyah', role: 'top' })).toBe(false)
  })
})

describe('reviewsForView', () => {
  it('filters and sorts newest first', () => {
    const result = reviewsForView([taliyahVsZed, ahriVsYasuo, taliyahVsYasuoMid], {
      myChamp: 'Taliyah',
    })
    expect(result).toEqual([taliyahVsYasuoMid, taliyahVsZed])
  })
})

describe('tipsFromReview', () => {
  it('finds the tips linked to a review', () => {
    const linked = makeTip({ reviewId: taliyahVsYasuoMid.id })
    const other = makeTip({ id: '00000000-0000-4000-8000-000000000031' })
    expect(tipsFromReview([linked, other], taliyahVsYasuoMid.id)).toEqual([linked])
  })
})
