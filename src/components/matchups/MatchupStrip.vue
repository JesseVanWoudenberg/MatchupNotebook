<template>
  <nav v-if="matchups.length > 0" aria-label="Matchups with notes" class="flex flex-wrap gap-2">
    <button
      v-for="matchup in matchups"
      :key="matchup.enemy"
      type="button"
      class="group relative flex flex-col items-center gap-1 rounded-md p-1.5 transition-colors hover:bg-(--color-surface-raised)"
      :class="{ 'bg-(--color-primary-soft)': matchup.enemy === current }"
      :title="
        matchup.enemy === current
          ? 'Back to ' + championStore.nameOf(myChamp) + ' in general'
          : describe(matchup)
      "
      @click="emit('select', matchup.enemy)"
    >
      <ChampionIcon :champion="championOf(matchup.enemy)!" :size="40" />
      <span class="text-[11px] text-(--color-on-surface-muted)">{{ matchup.total }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChampId, Role } from '@/schema'
import ChampionIcon from '@/components/champions/ChampionIcon.vue'
import { matchupsWithContent, type MatchupContent } from '@/model/matchups'
import { useChampionStore } from '@/stores/champions'
import { useNotebookStore } from '@/stores/notebook'

/**
 * One portrait per enemy your champ has notes for, with a count. The
 * overview of where you have content, without opening every matchup.
 */
const props = defineProps<{
  myChamp: ChampId
  /** Highlighted. */
  current?: ChampId
  role?: Role
}>()

const emit = defineEmits<{ select: [enemy: ChampId] }>()

const championStore = useChampionStore()
const notebookStore = useNotebookStore()

/** Enemies the champion data does not know are left out rather than shown as a blank tile. */
const matchups = computed(() =>
  notebookStore.notebook
    ? matchupsWithContent(notebookStore.notebook, props.myChamp, championStore.nameOf).filter(
        (matchup) => championStore.get(matchup.enemy) !== undefined,
      )
    : [],
)

function championOf(id: ChampId) {
  return championStore.get(id)
}

function describe(matchup: MatchupContent): string {
  const parts: string[] = []
  if (matchup.tips) parts.push(`${matchup.tips} ${matchup.tips === 1 ? 'tip' : 'tips'}`)
  if (matchup.runePages) {
    parts.push(`${matchup.runePages} rune ${matchup.runePages === 1 ? 'page' : 'pages'}`)
  }
  if (matchup.skillOrders) {
    parts.push(`${matchup.skillOrders} skill ${matchup.skillOrders === 1 ? 'order' : 'orders'}`)
  }
  return `vs ${championStore.nameOf(matchup.enemy)}: ${parts.join(', ')}`
}
</script>
