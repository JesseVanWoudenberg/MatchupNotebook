import { z } from 'zod'
import type { ChampId } from '@/schema'
import { Champion, ChampionSnapshot } from './champions'

/**
 * Riot's public Data Dragon files. No API key. The fetch function is injected
 * so the Tauri HTTP plugin does the network work and tests use a fake.
 */
export const DATA_DRAGON_BASE = 'https://ddragon.leagueoflegends.com'
export const VERSIONS_URL = `${DATA_DRAGON_BASE}/api/versions.json`
const LOCALE = 'en_US'

export function championListUrl(version: string): string {
  return `${DATA_DRAGON_BASE}/cdn/${version}/data/${LOCALE}/champion.json`
}

export function championIconRemoteUrl(version: string, id: ChampId): string {
  return `${DATA_DRAGON_BASE}/cdn/${version}/img/champion/${id}.png`
}

/** Every champion with spells and stats in one file, about 2 MB. */
export function championFullUrl(version: string): string {
  return `${DATA_DRAGON_BASE}/cdn/${version}/data/${LOCALE}/championFull.json`
}

/** `icon` is Data Dragon's file name for the spell, like "LeblancW.png". */
export function abilityIconRemoteUrl(version: string, icon: string): string {
  return `${DATA_DRAGON_BASE}/cdn/${version}/img/spell/${icon}`
}

/** A real Data Dragon version, like "16.20.1". versions.json also lists junk like "lolpatch_7.20". */
const DDRAGON_VERSION = /^\d+\.\d+\.\d+$/

const VersionsResponse = z.array(z.string()).min(1)

const ChampionListResponse = z.object({
  version: z.string().min(1),
  data: z.record(
    z.string(),
    z.object({
      id: z.string(),
      key: z.string(),
      name: z.string(),
    }),
  ),
})

export type TextFetcher = (url: string) => Promise<string>

/** Newest real version first. Throws on an unexpected response. */
export function parseVersions(json: string): string[] {
  const versions = VersionsResponse.parse(JSON.parse(json))
  return versions.filter((version) => DDRAGON_VERSION.test(version))
}

/** Data Dragon's champion.json into our compact snapshot. Throws on an unexpected response. */
export function parseChampionList(json: string, knownVersions: string[]): ChampionSnapshot {
  const response = ChampionListResponse.parse(JSON.parse(json))
  const champions = Object.values(response.data)
    .map((entry) => Champion.parse({ id: entry.id, key: Number(entry.key), name: entry.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return ChampionSnapshot.parse({ version: response.version, champions, knownVersions })
}

/** Where downloaded snapshots live between launches. */
export interface ChampionCache {
  read(): Promise<ChampionSnapshot | undefined>
  write(snapshot: ChampionSnapshot): Promise<void>
}

export type ChampionDataSource = 'fresh' | 'cache' | 'bundled'

export interface ChampionDataResult {
  snapshot: ChampionSnapshot
  source: ChampionDataSource
}

/**
 * Compare Data Dragon versions numerically ("16.20.1" > "16.9.1").
 * Positive when a is newer than b.
 */
export function compareDataDragonVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Fallback order from the spec: fresh data, then cache, then the bundled
 * default. One call to versions.json; the champion list is downloaded only
 * when it is newer than what we already have. Network and cache failures are
 * reported through `onProblem` and never surface as errors: the app always
 * has champion data.
 */
export async function resolveChampionData(
  bundled: ChampionSnapshot,
  cache: ChampionCache,
  fetchText: TextFetcher,
  onProblem: (message: string, error: unknown) => void = () => {},
): Promise<ChampionDataResult> {
  let best: ChampionDataResult = { snapshot: bundled, source: 'bundled' }

  try {
    const cached = await cache.read()
    if (cached && compareDataDragonVersions(cached.version, best.snapshot.version) > 0) {
      best = { snapshot: cached, source: 'cache' }
    }
  } catch (error: unknown) {
    onProblem('Could not read the champion cache.', error)
  }

  try {
    const versions = parseVersions(await fetchText(VERSIONS_URL))
    const latest = versions[0]
    if (latest !== undefined && compareDataDragonVersions(latest, best.snapshot.version) > 0) {
      const snapshot = parseChampionList(await fetchText(championListUrl(latest)), versions)
      best = { snapshot, source: 'fresh' }
      try {
        await cache.write(snapshot)
      } catch (error: unknown) {
        onProblem('Could not write the champion cache.', error)
      }
    } else if (latest !== undefined && best.snapshot.knownVersions === undefined) {
      // Same data, but we learned the version list. Keep it for the age filter.
      best = { ...best, snapshot: { ...best.snapshot, knownVersions: versions } }
    }
  } catch (error: unknown) {
    onProblem('Could not check Data Dragon for a newer patch.', error)
  }

  return best
}
