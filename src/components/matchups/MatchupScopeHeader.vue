<template>
  <div v-if="myChamp" class="flex flex-col gap-6">
    <MatchupHeader
      :my-champ="myChamp"
      :enemy="enemy"
      :role="scope.role"
      @change-my-champ="picking = 'myChamp'"
      @change-enemy="picking = 'enemy'"
      @clear-enemy="change({ enemy: undefined })"
      @update-role="change({ role: $event })"
    />

    <section
      v-if="picking"
      class="flex flex-col gap-3 rounded-lg border border-(--color-primary) bg-(--color-surface) p-4"
    >
      <div class="flex items-center justify-between">
        <h2 class="font-medium">
          {{ picking === 'enemy' ? 'Who is the enemy?' : 'Who are you playing?' }}
        </h2>
        <BaseButton variant="text" size="sm" @click="picking = undefined">Cancel</BaseButton>
      </div>
      <ChampionPicker :exclude="picking === 'enemy' ? myChamp.id : undefined" @select="onPicked" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChampId, MatchupScope, Role } from '@/schema'
import { BaseButton } from '@/components/base'
import ChampionPicker from '@/components/champions/ChampionPicker.vue'
import { useChampionStore } from '@/stores/champions'
import MatchupHeader from './MatchupHeader.vue'

/**
 * The matchup header plus the inline champion picker it opens. Emits the
 * changed scope; the page decides whether that means navigating or just
 * updating local state.
 */
const props = defineProps<{ scope: MatchupScope }>()

const emit = defineEmits<{ 'update:scope': [scope: MatchupScope] }>()

const championStore = useChampionStore()
const picking = ref<'myChamp' | 'enemy'>()

const myChamp = computed(() => championStore.get(props.scope.myChamp))
const enemy = computed(() => (props.scope.enemy ? championStore.get(props.scope.enemy) : undefined))

function change(changes: { myChamp?: ChampId; enemy?: ChampId; role?: Role }): void {
  const next: MatchupScope = { myChamp: changes.myChamp ?? props.scope.myChamp }
  const nextEnemy = 'enemy' in changes ? changes.enemy : props.scope.enemy
  const nextRole = 'role' in changes ? changes.role : props.scope.role
  if (nextEnemy !== undefined) next.enemy = nextEnemy
  if (nextRole !== undefined) next.role = nextRole
  emit('update:scope', next)
}

function onPicked(champId: ChampId): void {
  const which = picking.value
  picking.value = undefined
  if (which === 'enemy') change({ enemy: champId })
  if (which === 'myChamp') change({ myChamp: champId })
}
</script>
