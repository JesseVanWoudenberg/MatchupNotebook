import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { TextFetcher } from '@/data/dataDragon'
import { resolveRuneData, type RuneCache, type RuneDataSource } from '@/data/runeRefresh'
import {
  SHARD_NAMES,
  bundledRuneIconUrl,
  bundledStyleIconUrl,
  loadBundledRunes,
  remoteRuneIconUrl,
  shardIconUrl,
  type RunePerk,
  type RuneSnapshot,
  type RuneStyle,
} from '@/data/runes'
import { perkById, styleById } from '@/model/runeRules'

/**
 * Rune trees, perks and shards for the current patch. Starts from the bundled
 * snapshot; `refresh` follows the champion data's version.
 */
export const useRuneStore = defineStore('runes', () => {
  const snapshot = ref<RuneSnapshot>(loadBundledRunes())
  const source = ref<RuneDataSource>('bundled')
  const lastProblem = ref<string>()
  const bundledPerkIds = new Set<number>()
  const bundledStyleIds = new Set<number>()
  for (const style of snapshot.value.styles) {
    bundledStyleIds.add(style.id)
    for (const row of style.slots) for (const perk of row) bundledPerkIds.add(perk.id)
  }

  const styles = computed<readonly RuneStyle[]>(() => snapshot.value.styles)
  const dataVersion = computed(() => snapshot.value.version)

  async function refresh(
    targetVersion: string,
    cache: RuneCache,
    fetchText: TextFetcher,
  ): Promise<void> {
    lastProblem.value = undefined
    const result = await resolveRuneData(
      targetVersion,
      loadBundledRunes(),
      cache,
      fetchText,
      (message, error) => {
        lastProblem.value = message
        console.warn(message, error)
      },
    )
    snapshot.value = result.snapshot
    source.value = result.source
  }

  function style(id: number | undefined): RuneStyle | undefined {
    return styleById(snapshot.value, id)
  }

  function perk(id: number): RunePerk | undefined {
    return perkById(snapshot.value, id)
  }

  /** Perk name, shard name, or the raw id when the data does not know it. */
  function nameOf(id: number): string {
    return perk(id)?.name ?? SHARD_NAMES[id] ?? String(id)
  }

  /** Bundled icon when we ship one, Data Dragon's CDN for perks newer than the bundle. */
  function perkIconUrl(id: number): string {
    if (SHARD_NAMES[id] !== undefined) return shardIconUrl(id)
    if (bundledPerkIds.has(id)) return bundledRuneIconUrl(id)
    const known = perk(id)
    return known ? remoteRuneIconUrl(known.icon) : bundledRuneIconUrl(id)
  }

  function styleIconUrl(id: number): string {
    if (bundledStyleIds.has(id)) return bundledStyleIconUrl(id)
    const known = style(id)
    return known ? remoteRuneIconUrl(known.icon) : bundledStyleIconUrl(id)
  }

  return {
    snapshot,
    styles,
    dataVersion,
    source,
    lastProblem,
    refresh,
    style,
    perk,
    nameOf,
    perkIconUrl,
    styleIconUrl,
  }
})
