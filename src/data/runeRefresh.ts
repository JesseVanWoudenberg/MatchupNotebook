import type { TextFetcher } from './dataDragon'
import { compareDataDragonVersions } from './dataDragon'
import { parseRunesReforged, runesUrl, type RuneSnapshot } from './runes'

/** Where downloaded rune snapshots live between launches. */
export interface RuneCache {
  read(): Promise<RuneSnapshot | undefined>
  write(snapshot: RuneSnapshot): Promise<void>
}

export type RuneDataSource = 'fresh' | 'cache' | 'bundled'

export interface RuneDataResult {
  snapshot: RuneSnapshot
  source: RuneDataSource
}

/**
 * Rune data follows the champion data's version: the same patch that gave
 * us the champion list. Cache when it already holds that version, download
 * when it is newer than what we have, bundle otherwise. Never throws.
 */
export async function resolveRuneData(
  targetVersion: string,
  bundled: RuneSnapshot,
  cache: RuneCache,
  fetchText: TextFetcher,
  onProblem: (message: string, error: unknown) => void = () => {},
): Promise<RuneDataResult> {
  let best: RuneDataResult = { snapshot: bundled, source: 'bundled' }

  try {
    const cached = await cache.read()
    if (cached && compareDataDragonVersions(cached.version, best.snapshot.version) > 0) {
      best = { snapshot: cached, source: 'cache' }
    }
  } catch (error: unknown) {
    onProblem('Could not read the rune cache.', error)
  }

  if (compareDataDragonVersions(targetVersion, best.snapshot.version) <= 0) return best

  try {
    const snapshot = parseRunesReforged(await fetchText(runesUrl(targetVersion)), targetVersion)
    best = { snapshot, source: 'fresh' }
    try {
      await cache.write(snapshot)
    } catch (error: unknown) {
      onProblem('Could not write the rune cache.', error)
    }
  } catch (error: unknown) {
    onProblem('Could not download rune data for the new patch.', error)
  }

  return best
}
