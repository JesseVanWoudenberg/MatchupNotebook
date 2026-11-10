<template>
  <!-- `relative` keeps the hidden input inside the label; without it the input stretches the whole document. -->
  <label
    class="relative inline-flex cursor-pointer items-center gap-2 text-sm select-none"
    :class="{ 'text-(--color-on-surface-muted)': !model }"
  >
    <input v-model="model" type="checkbox" class="peer sr-only" :disabled="disabled" />
    <span
      class="relative h-4 w-7 shrink-0 rounded-full bg-(--color-outline-strong) transition-colors peer-checked:bg-(--color-primary) peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--color-primary) peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:h-3 after:w-3 after:rounded-full after:bg-(--color-surface) after:transition-transform peer-checked:after:translate-x-3"
    />
    <slot />
  </label>
</template>

<script setup lang="ts">
/**
 * A switch: a native checkbox drawn as a small track and knob, so a
 * yes-or-no option reads as a control rather than a line of text. The
 * label is the slot and clicks anywhere on it.
 */
const model = defineModel<boolean>({ default: false })

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
</script>
