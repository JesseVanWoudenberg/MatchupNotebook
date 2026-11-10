import { scopeSpecificity, type RunePage } from '@/schema'
import type { RuneSnapshot } from '@/data/runes'
import { scopeFitsView, type FitOptions, type ScopeFilter } from './matchup'
import { validateRuneSelection } from './runeRules'

/** Most specific first, then most recently changed. */
export function compareRunePagesForView(a: RunePage, b: RunePage): number {
  const bySpecificity = scopeSpecificity(b.scope) - scopeSpecificity(a.scope)
  if (bySpecificity !== 0) return bySpecificity
  return b.updatedAt.localeCompare(a.updatedAt)
}

/** Every page that fits the view, best first. Same fit rule as tips. */
export function runePagesForView(
  pages: readonly RunePage[],
  view: ScopeFilter,
  options: FitOptions = {},
): RunePage[] {
  return pages
    .filter((page) => scopeFitsView(page.scope, view, options))
    .sort(compareRunePagesForView)
}

/** The page a matchup shows: the most specific one that fits, if any. */
export function bestRunePageForView(
  pages: readonly RunePage[],
  view: ScopeFilter,
): RunePage | undefined {
  return runePagesForView(pages, view)[0]
}

/** True when the current rune data no longer accepts this page as it is. */
export function runePageNeedsUpdate(page: RunePage, snapshot: RuneSnapshot): boolean {
  return validateRuneSelection(page, snapshot).length > 0
}
