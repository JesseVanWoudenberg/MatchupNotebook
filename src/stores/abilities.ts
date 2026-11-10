import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ChampId } from '@/schema'
import {
  loadBundledAbilities,
  type AbilitySnapshot,
  type ChampionAbilities,
} from '@/data/abilities'
import { loadBundledCuration, type AbilityCuration } from '@/data/abilityCuration'
import {
  resolveAbilityData,
  type AbilityCache,
  type AbilityDataSource,
} from '@/data/abilityRefresh'
import { abilityIconRemoteUrl, type TextFetcher } from '@/data/dataDragon'
import { displayPatchFromDataDragon } from '@/data/patch'
import { displayAbilities, type DisplayAbility } from '@/model/abilityDisplay'
import { rangeRings, type RangeRing } from '@/model/rangeRings'

/**
 * Every champion's ability numbers for the current patch, plus the curated
 * marks shipped with the app. Starts from the bundle; `refresh` follows the
 * champion data's version like the rune store does.
 */
export const useAbilityStore = defineStore('abilities', () => {
  const snapshot = ref<AbilitySnapshot>(loadBundledAbilities())
  const curation = ref<AbilityCuration>(loadBundledCuration())
  const source = ref<AbilityDataSource>('bundled')
  const lastProblem = ref<string>()

  const dataVersion = computed(() => snapshot.value.version)
  /** The player-facing patch the numbers belong to, shown next to them. */
  const patch = computed(() => displayPatchFromDataDragon(snapshot.value.version))
  const byId = computed(
    () => new Map(snapshot.value.champions.map((champion) => [champion.id, champion])),
  )

  async function refresh(
    targetVersion: string,
    cache: AbilityCache,
    fetchText: TextFetcher,
  ): Promise<void> {
    lastProblem.value = undefined
    const result = await resolveAbilityData(
      targetVersion,
      loadBundledAbilities(),
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

  function forChampion(id: ChampId): ChampionAbilities | undefined {
    return byId.value.get(id)
  }

  /** The four rows the panel shows, or an empty list for a champion the data does not know. */
  function rowsFor(id: ChampId): DisplayAbility[] {
    const champion = byId.value.get(id)
    return champion ? displayAbilities(champion, curation.value) : []
  }

  /** The rings the range picture draws: the lane card's, or the blanket rule's. */
  function ringsFor(id: ChampId): RangeRing[] {
    const champion = byId.value.get(id)
    if (!champion) return []
    const card = curation.value.laneCards.find((entry) => entry.champ === id)
    return rangeRings(champion, displayAbilities(champion, curation.value), card)
  }

  /** Ability icons are not bundled; they come from Data Dragon's CDN for the data's version. */
  function iconUrlOf(icon: string): string {
    return abilityIconRemoteUrl(snapshot.value.version, icon)
  }

  return {
    snapshot,
    curation,
    source,
    lastProblem,
    dataVersion,
    patch,
    refresh,
    forChampion,
    rowsFor,
    ringsFor,
    iconUrlOf,
  }
})
