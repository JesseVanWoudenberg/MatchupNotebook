<template>
  <label class="flex flex-col gap-1 text-sm">
    <span v-if="label" class="text-(--color-on-surface-muted)">{{ label }}</span>
    <input
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :autofocus="autofocus"
      class="rounded-md border bg-(--color-surface) px-3 py-2 text-(--color-on-surface) placeholder:text-(--color-on-surface-muted) focus:outline-2 focus:outline-offset-0 focus:outline-(--color-primary)"
      :class="error ? 'border-(--color-danger)' : 'border-(--color-outline)'"
      :aria-invalid="error ? 'true' : undefined"
    />
    <span v-if="error" class="text-(--color-danger)">{{ error }}</span>
  </label>
</template>

<script setup lang="ts">
const model = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    type?: 'text' | 'search' | 'password'
    autofocus?: boolean
    error?: string
  }>(),
  { type: 'text', autofocus: false },
)
</script>
