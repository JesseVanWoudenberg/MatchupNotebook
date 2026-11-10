import { parseChampionFull, type AbilitySnapshot } from './abilities'
import { championFullUrl, compareDataDragonVersions, type TextFetcher } from './dataDragon'

/** Where downloaded ability snapshots live between launches. */
export interface AbilityCache {
  read(): Promise<AbilitySnapshot | undefined>
  write(snapshot: AbilitySnapshot): Promise<void>
}

export type AbilityDataSource = 'fresh' | 'cache' | 'bundled'

export interface AbilityDataResult {
  snapshot: AbilitySnapshot
  source: AbilityDataSource
}

/**
 * Ability data follows the champion data's version, like rune data does:
 * cache when it already holds that version, download when the version is
 * newer than what we have, bundle otherwise. Never throws.
 */
export async function resolveAbilityData(
  targetVersion: string,
  bundled: AbilitySnapshot,
  cache: AbilityCache,
  fetchText: TextFetcher,
  onProblem: (message: string, error: unknown) => void = () => {},
): Promise<AbilityDataResult> {
  let best: AbilityDataResult = { snapshot: bundled, source: 'bundled' }

  try {
    const cached = await cache.read()
    if (cached && compareDataDragonVersions(cached.version, best.snapshot.version) > 0) {
      best = { snapshot: cached, source: 'cache' }
    }
  } catch (error: unknown) {
    onProblem('Could not read the ability cache.', error)
  }

  if (compareDataDragonVersions(targetVersion, best.snapshot.version) <= 0) return best

  try {
    const snapshot = parseChampionFull(await fetchText(championFullUrl(targetVersion)))
    best = { snapshot, source: 'fresh' }
    try {
      await cache.write(snapshot)
    } catch (error: unknown) {
      onProblem('Could not write the ability cache.', error)
    }
  } catch (error: unknown) {
    onProblem('Could not download ability data for the new patch.', error)
  }

  return best
}
