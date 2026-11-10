import type { ChampId, Role, TipKind, TipScope } from '@/schema'

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  bot: 'Bot',
  support: 'Support',
}

export const KIND_LABELS: Readonly<Record<TipKind, string>> = {
  setup: 'Setup',
  early: 'Early game',
  watch_out: 'Watch out',
  win_con: 'Win condition',
  general: 'General',
}

/** Heading for a tier of tips, by how many scope fields they set. */
export const TIER_LABELS: Readonly<Record<number, string>> = {
  3: 'This matchup, this lane',
  2: 'This matchup',
  1: 'General',
  0: 'Lane only',
}

export function tierLabel(specificity: number): string {
  return TIER_LABELS[specificity] ?? 'Other'
}

/** Looks up a display name for a champion id. */
export type ChampionNamer = (id: ChampId) => string

/**
 * "Taliyah vs Yasuo, mid", "Taliyah in general", "Against Yasuo, top".
 * Reads the same everywhere a scope is shown.
 */
export function describeScope(scope: TipScope, nameOf: ChampionNamer): string {
  const { myChamp, enemy, role } = scope
  const lane = role ? `, ${ROLE_LABELS[role].toLowerCase()}` : ''
  if (myChamp !== undefined && enemy !== undefined) {
    return `${nameOf(myChamp)} vs ${nameOf(enemy)}${lane}`
  }
  if (myChamp !== undefined) {
    return role ? `${nameOf(myChamp)}${lane}` : `${nameOf(myChamp)} in general`
  }
  if (enemy !== undefined) {
    return `Against ${nameOf(enemy)}${lane}`
  }
  return role ? `Any ${ROLE_LABELS[role].toLowerCase()} game` : 'Everything'
}
