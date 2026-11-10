<template>
  <label class="flex flex-col gap-1 text-sm" :class="{ 'w-fit': compact }">
    <span v-if="label" class="text-(--color-on-surface-muted)">{{ label }}</span>
    <select
      v-model="model"
      class="rounded-md border border-(--color-outline) bg-(--color-surface) text-(--color-on-surface) focus:outline-2 focus:outline-offset-0 focus:outline-(--color-primary)"
      :class="compact ? 'py-1 pr-7 pl-2' : 'px-3 py-2'"
    >
      <option v-if="placeholder !== undefined" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
export interface SelectOption {
  value: string
  label: string
}

const model = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    options: SelectOption[]
    label?: string
    /** Shown as a disabled first option while nothing is chosen. */
    placeholder?: string
    /** Hugs its content instead of filling the row. */
    compact?: boolean
  }>(),
  { compact: false },
)
</script>
