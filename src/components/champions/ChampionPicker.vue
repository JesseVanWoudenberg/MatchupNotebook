<template>
  <div class="flex flex-col gap-4">
    <form @submit.prevent="selectFirst">
      <BaseTextField
        v-model="query"
        type="search"
        :placeholder="placeholder"
        :autofocus="autofocus"
      />
    </form>

    <p v-if="groups.length === 0" class="text-sm text-(--color-on-surface-muted)">
      No champion matches "{{ query }}".
    </p>

    <section v-for="group in groups" :key="group.title" class="flex flex-col gap-2">
      <h2
        v-if="groups.length > 1"
        class="text-xs font-semibold tracking-wide text-(--color-on-surface-muted) uppercase"
      >
        {{ group.title }}
      </h2>
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
        <li v-for="champion in group.champions" :key="champion.id" class="group relative">
          <button
            type="button"
            class="flex w-full flex-col items-center gap-1.5 rounded-md p-2 text-xs text-(--color-on-surface) transition-colors hover:bg-(--color-surface-raised) focus-visible:outline-2 focus-visible:outline-(--color-primary)"
            :title="champion.name"
            @click="emit('select', champion.id)"
          >
            <ChampionIcon :champion="champion" :size="56" />
            <span class="w-full truncate text-center">{{ champion.name }}</span>
          </button>
          <button
            v-if="favorites"
            type="button"
            class="absolute top-1 right-1 rounded p-1 transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-(--color-primary)"
            :class="
              isFavorite(champion.id)
                ? 'text-(--color-favorite) opacity-100'
                : 'text-(--color-on-surface-muted) opacity-0 group-hover:opacity-100 hover:text-(--color-favorite)'
            "
            :aria-pressed="isFavorite(champion.id)"
            :title="isFavorite(champion.id) ? 'Remove from your champs' : 'Add to your champs'"
            @click.stop="emit('toggleFavorite', champion.id)"
          >
            <BaseIcon name="star" :size="14" :filled="isFavorite(champion.id)" />
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChampId } from '@/schema'
import type { Champion } from '@/data/champions'
import { BaseIcon, BaseTextField } from '@/components/base'
import { useChampionStore } from '@/stores/champions'
import ChampionIcon from './ChampionIcon.vue'

const props = withDefaults(
  defineProps<{
    /** A champion to leave out, like your own champ when picking the enemy. */
    exclude?: ChampId
    /**
     * Your champion pool. When given, a star on every card toggles it and the
     * pool shows first while the search box is empty.
     */
    favorites?: readonly ChampId[]
    placeholder?: string
    autofocus?: boolean
  }>(),
  { placeholder: 'Search champions', autofocus: true },
)

const emit = defineEmits<{
  select: [champId: ChampId]
  toggleFavorite: [champId: ChampId]
}>()

interface ChampionGroup {
  title: string
  champions: Champion[]
}

const championStore = useChampionStore()
const query = ref('')

const results = computed(() =>
  championStore.search(query.value).filter((champion) => champion.id !== props.exclude),
)

const favoriteChampions = computed(() =>
  (props.favorites ?? [])
    .map((id) => championStore.get(id))
    .filter((champion): champion is Champion => champion !== undefined)
    .filter((champion) => champion.id !== props.exclude),
)

const groups = computed<ChampionGroup[]>(() => {
  const isSearching = query.value.trim() !== ''
  if (isSearching || favoriteChampions.value.length === 0) {
    return results.value.length > 0 ? [{ title: 'All champions', champions: results.value }] : []
  }
  return [
    { title: 'Your champs', champions: favoriteChampions.value },
    { title: 'All champions', champions: results.value },
  ]
})

function isFavorite(id: ChampId): boolean {
  return props.favorites?.includes(id) ?? false
}

/** Enter in the search box picks the top result. */
function selectFirst(): void {
  const first = groups.value[0]?.champions[0]
  if (first) emit('select', first.id)
}
</script>
