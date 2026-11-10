<template>
  <div class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      role="status"
      class="pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-lg"
      :class="
        toast.kind === 'error'
          ? 'border-(--color-danger) bg-(--color-danger-soft) text-(--color-on-surface)'
          : 'border-(--color-outline) bg-(--color-surface) text-(--color-on-surface)'
      "
    >
      <span class="flex-1 selectable">{{ toast.message }}</span>
      <BaseButton variant="text" size="sm" aria-label="Dismiss" @click="dismiss(toast.id)">
        <BaseIcon name="x" :size="14" />
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BaseButton, BaseIcon } from '@/components/base'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>
