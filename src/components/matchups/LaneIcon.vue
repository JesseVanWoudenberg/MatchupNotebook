<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 34 34"
    aria-hidden="true"
    class="shrink-0"
    v-html="markup"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Role } from '@/schema'
import { LANE_ICONS } from '@/components/icons/laneIcons'

const props = withDefaults(defineProps<{ role: Role; size?: number }>(), { size: 20 })

// Constant markup from our own registry, so v-html is safe here.
const markup = computed(() => LANE_ICONS[props.role])
</script>
