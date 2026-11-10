<template>
  <PageShell title="Pick your champ" subtitle="Star the champions you play. They show up first.">
    <ChampionPicker
      :favorites="notebookStore.favoriteChamps"
      @select="openMatchup"
      @toggle-favorite="toggleFavorite"
    />
  </PageShell>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { ChampId } from '@/schema'
import { PageShell } from '@/components/composite'
import ChampionPicker from '@/components/champions/ChampionPicker.vue'
import { useToast } from '@/composables/useToast'
import { useNotebookStore } from '@/stores/notebook'

const router = useRouter()
const toast = useToast()
const notebookStore = useNotebookStore()

function openMatchup(myChamp: ChampId): void {
  void router.push({ name: 'Matchup', params: { myChamp } })
}

async function toggleFavorite(champId: ChampId): Promise<void> {
  try {
    await notebookStore.toggleFavorite(champId)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Could not save your champs.')
  }
}
</script>
