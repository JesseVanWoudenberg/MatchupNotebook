<template>
  <div role="tablist" class="flex gap-1 border-b border-(--color-outline)">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="model === tab.value"
      class="-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-(--color-primary)"
      :class="
        model === tab.value
          ? 'border-(--color-primary) text-(--color-on-surface)'
          : 'border-transparent text-(--color-on-surface-muted) hover:text-(--color-on-surface)'
      "
      @click="model = tab.value"
    >
      <BaseIcon v-if="tab.icon" :name="tab.icon" :size="15" />
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="text-xs text-(--color-on-surface-muted)">
        {{ tab.count }}
      </span>
      <span
        v-if="tab.warning"
        class="h-1.5 w-1.5 rounded-full bg-(--color-danger)"
        :title="tab.warning"
        :aria-label="tab.warning"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { IconName } from '@/components/icons/icons'
import BaseIcon from './BaseIcon.vue'

export interface TabOption {
  value: string
  label: string
  icon?: IconName
  count?: number
  /** A short reason shown as a red dot, like "A rune page needs an update." */
  warning?: string
}

const model = defineModel<string>({ required: true })

defineProps<{ tabs: TabOption[] }>()
</script>
