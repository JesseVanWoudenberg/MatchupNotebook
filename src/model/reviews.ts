import type { Review, Tip, Uuid } from '@/schema'
import type { ScopeFilter } from './matchup'

/**
 * Which past reviews belong on a matchup page. Your champ must match.
 * An enemy or lane in the view must match too; a review without a lane
 * still shows when a lane is selected. A page without an enemy shows every
 * review for that champ, which doubles as the champ's history.
 */
export function reviewFitsView(review: Review, view: ScopeFilter): boolean {
  if (view.myChamp === undefined || review.scope.myChamp !== view.myChamp) return false
  if (view.enemy !== undefined && review.scope.enemy !== view.enemy) return false
  if (
    view.role !== undefined &&
    review.scope.role !== undefined &&
    review.scope.role !== view.role
  ) {
    return false
  }
  return true
}

/** Newest first. */
export function reviewsForView(reviews: readonly Review[], view: ScopeFilter): Review[] {
  return reviews
    .filter((review) => reviewFitsView(review, view))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Tips that came out of a review. */
export function tipsFromReview(tips: readonly Tip[], reviewId: Uuid): Tip[] {
  return tips.filter((tip) => tip.reviewId === reviewId)
}
