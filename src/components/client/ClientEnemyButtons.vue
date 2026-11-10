<template>
  <section
    class="flex flex-wrap items-center gap-2 rounded-lg border border-(--color-primary) bg-(--color-primary-soft) px-3 py-2"
  >
    <span class="mr-1 flex items-center gap-1.5 text-sm font-medium text-(--color-primary)">
      <BaseIcon name="swords" :size="15" />
      {{ label }}
    </span>
    <template v-if="known.length > 0">
      <button
        v-for="enemy in known"
        :key="enemy.id"
        type="button"
        class="rounded-md p-1 transition-colors hover:bg-(--color-surface)"
        :class="{ 'bg-(--color-surface) ring-2 ring-(--color-primary)': enemy.id === current }"
        :title="'vs ' + enemy.name"
        @click="emit('select', enemy.id)"
      >
        <ChampionIcon :champion="enemy" :size="36" />
      </button>
    </template>
    <span v-else class="text-sm text-(--color-on-surface-muted)">{{ emptyText }}</span>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChampId } from '@/schema'
import type { Champion } from '@/data/champions'
import { BaseIcon } from '@/components/base'
import ChampionIcon from '@/components/champions/ChampionIcon.vue'
import { useChampionStore } from '@/stores/champions'

/** Enemy portraits the client reported, as buttons. One click picks the matchup. */
const props = withDefaults(
  defineProps<{
    label: string
    enemies: readonly ChampId[]
    /** Highlighted. */
    current?: ChampId
    emptyText?: string
  }>(),
  { emptyText: 'Enemies show up here as they lock in.' },
)

const emit = defineEmits<{ select: [enemy: ChampId] }>()

const championStore = useChampionStore()

const known = computed(() =>
  props.enemies.flatMap((id): Champion[] => {
    const champion = championStore.get(id)
    return champion ? [champion] : []
  }),
)
</script>
