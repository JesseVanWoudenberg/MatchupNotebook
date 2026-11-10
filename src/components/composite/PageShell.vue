<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-(--space-page) py-6">
    <header class="flex items-center gap-3">
      <BaseButton v-if="back" variant="text" size="sm" aria-label="Back" @click="emit('back')">
        <BaseIcon name="chevron-left" />
      </BaseButton>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-xl font-semibold">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-(--color-on-surface-muted)">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-2"><slot name="actions" /></div>
    </header>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { BaseButton, BaseIcon } from '@/components/base'

withDefaults(defineProps<{ title: string; subtitle?: string; back?: boolean }>(), {
  back: false,
})

const emit = defineEmits<{ back: [] }>()
</script>
