<template>
  <details class="rounded-lg border border-dashed border-(--color-outline) p-3 text-sm">
    <summary class="cursor-pointer font-medium">Simulate the client (dev build only)</summary>
    <div class="mt-3 flex flex-col gap-3">
      <p class="text-(--color-on-surface-muted)">
        Feeds a fake champ select and game phases into the app, so the live view can be tried
        without a second player. A connected client keeps sending its own events too.
      </p>
      <div class="flex flex-wrap items-end gap-2">
        <BaseTextField v-model="myChampName" label="Your champ" class="w-40" />
        <BaseSelect v-model="role" label="Lane" :options="roleOptions" compact />
        <BaseTextField v-model="enemyNames" label="Enemies, comma separated" class="w-80" />
      </div>
      <p v-if="unknownNames.length > 0" class="text-(--color-danger)">
        Not a champion: {{ unknownNames.join(', ') }}
      </p>
      <div class="flex flex-wrap gap-2">
        <BaseButton variant="outlined" :disabled="myKey === undefined" @click="startChampSelect">
          Champ select
        </BaseButton>
        <BaseButton variant="outlined" @click="setPhase('InProgress')">Game start</BaseButton>
        <BaseButton variant="outlined" @click="setPhase('EndOfGame')">Game end</BaseButton>
        <BaseButton variant="text" @click="setPhase('None')">Lobby</BaseButton>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ROLES, type Role } from '@/schema'
import { BaseButton, BaseSelect, BaseTextField, type SelectOption } from '@/components/base'
import { ROLE_LABELS } from '@/model/labels'
import { useChampionStore } from '@/stores/champions'
import { useClientStore } from '@/stores/client'

/**
 * Dev tool, rendered only in development builds: drives the client store
 * with made-up events in the client's own shape, the same path the Rust
 * side feeds. Nothing here touches the League client.
 */
const championStore = useChampionStore()
const clientStore = useClientStore()

const myChampName = ref('Taliyah')
const role = ref<Role>('mid')
const enemyNames = ref('Akshan, Zed, Jinx, Thresh, Lee Sin')

const roleOptions: SelectOption[] = ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))

/** The client's position names, the reverse of what the parser maps. */
const POSITIONS: Readonly<Record<Role, string>> = {
  top: 'top',
  jungle: 'jungle',
  mid: 'middle',
  bot: 'bottom',
  support: 'utility',
}

function keyFor(name: string): number | undefined {
  return championStore.search(name.trim())[0]?.key
}

const myKey = computed(() => keyFor(myChampName.value))
const enemyEntries = computed(() =>
  enemyNames.value
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '')
    .map((name) => ({ name, key: keyFor(name) })),
)
const unknownNames = computed(() => {
  const names = enemyEntries.value
    .filter((entry) => entry.key === undefined)
    .map((entry) => entry.name)
  return myKey.value === undefined && myChampName.value.trim() !== ''
    ? [myChampName.value, ...names]
    : names
})

function setPhase(phase: string): void {
  clientStore.simulatePhase(phase)
}

function startChampSelect(): void {
  setPhase('ChampSelect')
  clientStore.simulateChampSelect({
    localPlayerCellId: 0,
    myTeam: [{ cellId: 0, championId: myKey.value, assignedPosition: POSITIONS[role.value] }],
    theirTeam: enemyEntries.value
      .filter((entry) => entry.key !== undefined)
      .map((entry, index) => ({ cellId: 5 + index, championId: entry.key })),
  })
}
</script>
