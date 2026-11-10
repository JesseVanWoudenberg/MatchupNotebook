<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
    v-html="markup"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from '@/components/icons/icons'

const props = withDefaults(defineProps<{ name: IconName; size?: number; filled?: boolean }>(), {
  size: 18,
  filled: false,
})

// The registry holds constant markup written by us, so v-html is safe here.
const markup = computed(() => ICONS[props.name])
</script>
