<template>
  <img
    :src="championStore.iconUrlOf(champion.id)"
    :alt="champion.name"
    :width="size"
    :height="size"
    class="rounded-md border border-(--color-outline) bg-(--color-surface-raised) object-cover"
    draggable="false"
  />
</template>

<script setup lang="ts">
import type { Champion } from '@/data/champions'
import { useChampionStore } from '@/stores/champions'

withDefaults(defineProps<{ champion: Champion; size?: number }>(), { size: 48 })

const championStore = useChampionStore()
</script>
