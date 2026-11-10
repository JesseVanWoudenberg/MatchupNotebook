<template>
  <div class="flex flex-wrap items-center gap-3">
    <span class="text-sm font-semibold tracking-wide">{{ summary }}</span>
    <ol class="flex gap-0.5" aria-label="Ability per level">
      <li
        v-for="(ability, index) in levels"
        :key="index"
        class="flex h-6 w-5 items-center justify-center rounded text-[11px] font-semibold"
        :class="ABILITY_CLASSES[ability]"
        :title="`Level ${index + 1}: ${ability}`"
      >
        {{ ability }}
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ability } from '@/schema'
import { summarizeMaxOrder } from '@/model/skillOrders'
import { ABILITY_CLASSES } from './abilityClasses'

const props = defineProps<{ levels: readonly Ability[] }>()

const summary = computed(() => summarizeMaxOrder(props.levels))
</script>
