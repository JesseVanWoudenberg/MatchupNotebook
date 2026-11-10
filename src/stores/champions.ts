import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ChampId, Patch } from '@/schema'
import {
  bundledIconUrl,
  loadBundledChampions,
  searchChampions,
  type Champion,
  type ChampionSnapshot,
} from '@/data/champions'
import {
  championIconRemoteUrl,
  resolveChampionData,
  type ChampionCache,
  type ChampionDataSource,
  type TextFetcher,
} from '@/data/dataDragon'
import { displayPatchFromDataDragon } from '@/data/patch'

/**
 * Champion list and the patch it belongs to. Starts from the bundled snapshot
 * so the app is usable at once, then `refresh` applies the cache or a fresh
 * download when they are newer.
 */
export const useChampionStore = defineStore('champions', () => {
  const snapshot = ref<ChampionSnapshot>()
  const source = ref<ChampionDataSource>('bundled')
  const isRefreshing = ref(false)
  const lastProblem = ref<string>()
  const bundledIds = new Set<ChampId>()

  const champions = computed<readonly Champion[]>(() => snapshot.value?.champions ?? [])
  const dataVersion = computed(() => snapshot.value?.version)
  const isLoaded = computed(() => champions.value.length > 0)
  const byId = computed(() => new Map(champions.value.map((champion) => [champion.id, champion])))
  /** Riot's numeric key, which the League client uses, to the string id. */
  const idByKey = computed(
    () => new Map(champions.value.map((champion) => [champion.key, champion.id])),
  )
  const currentPatch = computed(() =>
    dataVersion.value ? displayPatchFromDataDragon(dataVersion.value) : undefined,
  )
  /** Player-facing patches, newest first, for the "older than" filter. Empty until a refresh. */
  const knownPatches = computed<readonly Patch[]>(() =>
    (snapshot.value?.knownVersions ?? []).map(displayPatchFromDataDragon),
  )

  function initialize(): void {
    const bundled = loadBundledChampions()
    for (const champion of bundled.champions) bundledIds.add(champion.id)
    snapshot.value = bundled
    source.value = 'bundled'
  }

  /** Fallback order fresh, cache, bundled. Never throws; problems land in `lastProblem`. */
  async function refresh(cache: ChampionCache, fetchText: TextFetcher): Promise<void> {
    if (!snapshot.value) initialize()
    isRefreshing.value = true
    lastProblem.value = undefined
    try {
      const result = await resolveChampionData(
        loadBundledChampions(),
        cache,
        fetchText,
        (message, error) => {
          lastProblem.value = message
          console.warn(message, error)
        },
      )
      snapshot.value = result.snapshot
      source.value = result.source
    } finally {
      isRefreshing.value = false
    }
  }

  function get(id: ChampId): Champion | undefined {
    return byId.value.get(id)
  }

  function idForKey(key: number): ChampId | undefined {
    return idByKey.value.get(key)
  }

  /** Display name, or the raw id for a champion this data version does not know. */
  function nameOf(id: ChampId): string {
    return byId.value.get(id)?.name ?? id
  }

  /** Bundled icon when we ship one, else Data Dragon's CDN for champions newer than the bundle. */
  function iconUrlOf(id: ChampId): string {
    if (bundledIds.has(id) || !dataVersion.value) return bundledIconUrl(id)
    return championIconRemoteUrl(dataVersion.value, id)
  }

  function search(query: string): Champion[] {
    return searchChampions(champions.value, query)
  }

  return {
    champions,
    dataVersion,
    source,
    isRefreshing,
    lastProblem,
    isLoaded,
    currentPatch,
    knownPatches,
    initialize,
    refresh,
    get,
    idForKey,
    nameOf,
    iconUrlOf,
    search,
  }
})
