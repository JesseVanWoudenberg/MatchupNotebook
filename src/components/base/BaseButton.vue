<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) disabled:cursor-not-allowed disabled:opacity-50"
    :class="[VARIANT_CLASSES[variant], SIZE_CLASSES[size]]"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
type Variant = 'filled' | 'outlined' | 'text' | 'danger'
type Size = 'sm' | 'md'

withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { variant: 'filled', size: 'md', type: 'button', disabled: false },
)

const VARIANT_CLASSES: Record<Variant, string> = {
  filled: 'bg-(--color-primary) text-(--color-on-primary) hover:brightness-110',
  outlined:
    'border border-(--color-outline-strong) bg-(--color-surface) text-(--color-on-surface) hover:bg-(--color-surface-raised)',
  text: 'text-(--color-on-surface-muted) hover:bg-(--color-surface-raised) hover:text-(--color-on-surface)',
  danger: 'text-(--color-danger) hover:bg-(--color-danger-soft)',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5',
}
</script>
