<template>
  <span
    v-if="myChamp || enemy || role"
    class="inline-flex items-center gap-1 text-(--color-on-surface-muted)"
    :title="label"
    :aria-label="label"
  >
    <ChampionIcon v-if="myChamp" :champion="myChamp" :size="SIZE" />
    <span v-if="myChamp && enemy" class="text-[10px] leading-none">vs</span>
    <ChampionIcon v-if="enemy" :champion="enemy" :size="SIZE" />
    <LaneIcon v-if="role" :role="role" :size="SIZE" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TipScope } from '@/schema'
import ChampionIcon from '@/components/champions/ChampionIcon.vue'
import LaneIcon from '@/components/matchups/LaneIcon.vue'
import { describeScope } from '@/model/labels'
import type { ScopeFilter } from '@/model/matchup'
import { useChampionStore } from '@/stores/champions'

/**
 * A scope as icons: your champ, the enemy, the lane. Each part shows only
 * when the item has it and the page being viewed does not already say the
 * same thing. On the Taliyah vs Yasuo page with mid selected, a tip scoped
 * exactly like that shows nothing; the same tip on the "any lane" page shows
 * just the mid icon.
 */
const props = defineProps<{ scope: TipScope; view: ScopeFilter }>()

const SIZE = 22

const championStore = useChampionStore()

const myChamp = computed(() =>
  props.scope.myChamp !== undefined && props.scope.myChamp !== props.view.myChamp
    ? championStore.get(props.scope.myChamp)
    : undefined,
)
const enemy = computed(() =>
  props.scope.enemy !== undefined && props.scope.enemy !== props.view.enemy
    ? championStore.get(props.scope.enemy)
    : undefined,
)
const role = computed(() =>
  props.scope.role !== undefined && props.scope.role !== props.view.role
    ? props.scope.role
    : undefined,
)

const label = computed(() => describeScope(props.scope, championStore.nameOf))
</script>
