<template>
  <span class="flex items-center p-1" :title="title" :aria-label="title">
    <span
      class="h-2.5 w-2.5 rounded-full"
      :class="clientStore.isConnected ? 'bg-(--color-success)' : 'bg-(--color-danger)'"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClientStore } from '@/stores/client'

/** Green when the League client is reachable, red otherwise. The only sign of client trouble. */
const clientStore = useClientStore()

const PHASE_LABELS: Readonly<Record<string, string>> = {
  Lobby: 'in the lobby',
  Matchmaking: 'in queue',
  ReadyCheck: 'ready check',
  ChampSelect: 'in champ select',
  GameStart: 'game starting',
  InProgress: 'in game',
  Reconnect: 'reconnecting',
  WaitingForStats: 'game over',
  PreEndOfGame: 'game over',
  EndOfGame: 'game over',
}

const title = computed(() => {
  if (!clientStore.isConnected) return 'League client: not found'
  const phase = PHASE_LABELS[clientStore.phase]
  return phase ? `League client: ${phase}` : 'League client: connected'
})
</script>
