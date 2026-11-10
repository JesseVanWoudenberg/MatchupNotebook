<template>
  <div
    data-tauri-drag-region
    class="flex h-screen flex-col justify-between gap-3 border border-(--color-outline) bg-(--color-surface) p-4 text-(--color-on-surface) select-none"
  >
    <div data-tauri-drag-region class="flex flex-col gap-1">
      <p class="text-xs font-semibold tracking-wide text-(--color-on-surface-muted) uppercase">
        Game over
      </p>
      <p class="text-lg font-semibold">{{ title }}</p>
      <p class="text-sm text-(--color-on-surface-muted)">Write a review while it is fresh?</p>
    </div>
    <div class="flex justify-end gap-2">
      <BaseButton variant="text" @click="notNow">Not now</BaseButton>
      <BaseButton :disabled="!game" @click="writeReview">
        <BaseIcon name="pencil" :size="15" />
        Write a review
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { GameSummary } from '@/data/leagueClient'
import { BaseButton, BaseIcon } from '@/components/base'
import { ROLE_LABELS } from '@/model/labels'
import { useChampionStore } from '@/stores/champions'
import { createLeagueClientLink } from '@/tauri/leagueClient'

/**
 * Lives in its own small window that never takes focus. The main window
 * does the actual work once "write a review" is clicked.
 */
const AUTO_CLOSE_MS = 3 * 60 * 1000

const link = createLeagueClientLink()
const championStore = useChampionStore()
const game = ref<GameSummary>()
let autoClose: ReturnType<typeof setTimeout> | undefined

const title = computed(() => {
  if (!game.value) return '…'
  const champ = championStore.nameOf(game.value.myChamp)
  return game.value.role ? `${champ}, ${ROLE_LABELS[game.value.role].toLowerCase()}` : champ
})

onMounted(async () => {
  game.value = await link.postGameContext()
  autoClose = setTimeout(notNow, AUTO_CLOSE_MS)
})

onUnmounted(() => clearTimeout(autoClose))

function notNow(): void {
  void link.closePostGamePopup()
}

function writeReview(): void {
  if (game.value) void link.answerWriteReview(game.value)
}
</script>
