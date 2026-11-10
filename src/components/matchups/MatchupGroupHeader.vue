<template>
  <component
    :is="enemy ? 'button' : 'h2'"
    :type="enemy ? 'button' : undefined"
    class="flex items-center gap-2 text-sm font-semibold"
    :class="
      enemy
        ? 'rounded-md py-1 pr-2 hover:bg-(--color-surface-raised)'
        : 'text-(--color-on-surface-muted)'
    "
    :title="enemy ? 'Open this matchup' : undefined"
    @click="enemy && emit('open', enemy)"
  >
    <ChampionIcon v-if="enemyChampion" :champion="enemyChampion" :size="28" />
    <span>{{ label }}</span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChampId } from '@/schema'
import ChampionIcon from '@/components/champions/ChampionIcon.vue'
import { useChampionStore } from '@/stores/champions'

/** Section header in the "show all matchups" view: your champ in general, or vs one enemy. */
const props = defineProps<{ myChamp: ChampId; enemy: ChampId | undefined }>()

const emit = defineEmits<{ open: [enemy: ChampId] }>()

const championStore = useChampionStore()

const enemyChampion = computed(() => (props.enemy ? championStore.get(props.enemy) : undefined))
const label = computed(() =>
  props.enemy
    ? `vs ${championStore.nameOf(props.enemy)}`
    : `${championStore.nameOf(props.myChamp)} in general`,
)
</script>
