<template>
  <span
    class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap"
    :class="TONE_CLASSES[tone]"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
type Tone = 'neutral' | 'primary' | 'imported' | 'danger'

withDefaults(defineProps<{ tone?: Tone }>(), { tone: 'neutral' })

const TONE_CLASSES: Record<Tone, string> = {
  neutral:
    'bg-(--color-surface-raised) text-(--color-on-surface-muted) border border-(--color-outline)',
  primary: 'bg-(--color-primary-soft) text-(--color-primary)',
  imported: 'bg-(--color-imported-soft) text-(--color-imported)',
  danger: 'bg-(--color-danger-soft) text-(--color-danger)',
}
</script>
