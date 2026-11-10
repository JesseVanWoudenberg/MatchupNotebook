<template>
  <section
    class="flex flex-wrap items-center gap-4 rounded-lg border border-(--color-outline) bg-(--color-surface) p-4"
  >
    <button
      type="button"
      class="flex items-center gap-3 rounded-md py-1 pr-4 pl-1 text-left hover:bg-(--color-surface-raised)"
      title="Change your champ"
      @click="emit('changeMyChamp')"
    >
      <ChampionIcon :champion="myChamp" :size="PORTRAIT_SIZE" />
      <span>
        <span class="block text-xs text-(--color-on-surface-muted)">You</span>
        <span class="block text-lg font-semibold">{{ myChamp.name }}</span>
      </span>
    </button>

    <span class="text-sm font-medium text-(--color-on-surface-muted)">vs</span>

    <button
      type="button"
      class="flex items-center gap-3 rounded-md py-1 pr-4 pl-1 text-left hover:bg-(--color-surface-raised)"
      :title="enemy ? 'Change the enemy' : 'Pick the enemy'"
      @click="emit('changeEnemy')"
    >
      <ChampionIcon v-if="enemy" :champion="enemy" :size="PORTRAIT_SIZE" />
      <span
        v-else
        class="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-(--color-outline-strong) text-(--color-on-surface-muted)"
      >
        <BaseIcon name="help" :size="22" />
      </span>
      <span>
        <span class="block text-xs text-(--color-on-surface-muted)">Enemy</span>
        <span
          class="block text-lg font-semibold"
          :class="{ 'text-(--color-on-surface-muted)': !enemy }"
        >
          {{ enemy?.name ?? 'Any' }}
        </span>
      </span>
    </button>
    <BaseButton
      v-if="enemy"
      variant="text"
      size="sm"
      aria-label="Clear the enemy"
      title="Clear the enemy"
      @click="emit('clearEnemy')"
    >
      <BaseIcon name="x" :size="14" />
    </BaseButton>

    <div class="flex-1" />

    <LaneSelector :model-value="role" @update:model-value="emit('updateRole', $event)" />
  </section>
</template>

<script setup lang="ts">
import type { Role } from '@/schema'
import type { Champion } from '@/data/champions'
import { BaseButton, BaseIcon } from '@/components/base'
import ChampionIcon from '@/components/champions/ChampionIcon.vue'
import LaneSelector from './LaneSelector.vue'

defineProps<{
  myChamp: Champion
  enemy?: Champion
  role?: Role
}>()

const emit = defineEmits<{
  changeMyChamp: []
  changeEnemy: []
  clearEnemy: []
  updateRole: [role: Role | undefined]
}>()

const PORTRAIT_SIZE = 56
</script>
