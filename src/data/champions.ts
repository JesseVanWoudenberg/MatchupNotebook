import { z } from 'zod'
import { ChampId } from '@/schema'
import bundledSnapshot from './bundled/champions.json'

/**
 * One champion as the app needs it. `id` is Riot's string id and the only
 * thing stored in tips. `key` is Riot's numeric id, which the League client
 * uses. `name` is for display only.
 */
export const Champion = z.strictObject({
  id: ChampId,
  key: z.int().positive(),
  name: z.string().min(1),
})
export type Champion = z.infer<typeof Champion>

/** A champion list tied to the Data Dragon version it came from. */
export const ChampionSnapshot = z.strictObject({
  version: z.string().min(1),
  champions: z.array(Champion).min(1),
  /** Data Dragon versions, newest first, when the snapshot came from a refresh. */
  knownVersions: z.array(z.string()).optional(),
})
export type ChampionSnapshot = z.infer<typeof ChampionSnapshot>

/** The snapshot shipped inside the app. Validated like any other input. */
export function loadBundledChampions(): ChampionSnapshot {
  return ChampionSnapshot.parse(bundledSnapshot)
}

/** Square icon shipped with the app, served from the public folder. */
export function bundledIconUrl(id: ChampId): string {
  return `/champion-icons/${id}.png`
}

/** "K'Sante" -> "ksante", "Nunu & Willump" -> "nunuwillump". */
export function normalizeChampionName(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Prefix matches first, then matches anywhere, each group alphabetical.
 * An empty query returns every champion alphabetically.
 */
export function searchChampions(champions: readonly Champion[], query: string): Champion[] {
  const needle = normalizeChampionName(query)
  const byName = (a: Champion, b: Champion) => a.name.localeCompare(b.name)
  if (needle === '') return [...champions].sort(byName)

  const prefix: Champion[] = []
  const anywhere: Champion[] = []
  for (const champion of champions) {
    const name = normalizeChampionName(champion.name)
    const id = normalizeChampionName(champion.id)
    if (name.startsWith(needle) || id.startsWith(needle)) prefix.push(champion)
    else if (name.includes(needle) || id.includes(needle)) anywhere.push(champion)
  }
  return [...prefix.sort(byName), ...anywhere.sort(byName)]
}
