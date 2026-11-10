<template>
  <details ref="panel" class="relative">
    <summary
      class="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1 text-xs text-(--color-on-surface-muted) transition-colors hover:bg-(--color-surface-raised) hover:text-(--color-on-surface) [&::-webkit-details-marker]:hidden"
      :class="{ 'text-(--color-primary)': isActive }"
      :title="isActive ? 'Filters on' : 'Filters'"
      :aria-label="isActive ? 'Filters on' : 'Filters'"
    >
      <BaseIcon name="filter" :size="14" :filled="isActive" />
      <span v-if="isActive">{{ summaryText }}</span>
    </summary>
    <div
      class="absolute right-0 z-10 mt-1 flex w-80 flex-col gap-3 rounded-lg border border-(--color-outline) bg-(--color-surface) p-3 text-sm shadow-lg"
    >
      <BaseToggle v-model="onlyMine" class="px-1">Only my tips</BaseToggle>
      <label
        class="flex items-center justify-between gap-3 px-1 whitespace-nowrap text-(--color-on-surface-muted)"
      >
        Hide tips older than
        <select
          v-model="olderThanChoice"
          class="rounded-md border border-(--color-outline) bg-(--color-surface) px-2 py-1 text-(--color-on-surface)"
        >
          <option :value="OFF">never</option>
          <option v-for="count in AGE_CHOICES" :key="count" :value="String(count)">
            {{ count }} {{ count === 1 ? 'patch' : 'patches' }}
          </option>
        </select>
      </label>
      <BaseToggle v-model="showPatch" class="px-1">Show the patch on each tip</BaseToggle>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { BaseIcon, BaseToggle } from '@/components/base'
import type { TipListFilters } from '@/model/matchup'

/**
 * The list filters, folded behind one small button: they are rarely used,
 * so they take no room until asked. The button says what is on, in a few
 * words, while a filter is active.
 */
const model = defineModel<TipListFilters>({ required: true })
/** A display choice rather than a filter; it lives here because this is where such things go. */
const showPatch = defineModel<boolean>('showPatch', { default: false })

const OFF = ''
const AGE_CHOICES = [1, 2, 3, 5, 10] as const

const panel = ref<HTMLDetailsElement>()

const onlyMine = computed({
  get: () => model.value.onlyMine,
  set: (onlyMine: boolean) => {
    model.value = { ...model.value, onlyMine }
  },
})

const olderThanChoice = computed({
  get: () => (model.value.hideOlderThan === undefined ? OFF : String(model.value.hideOlderThan)),
  set: (choice: string) => {
    const next: TipListFilters = { onlyMine: model.value.onlyMine }
    if (choice !== OFF) next.hideOlderThan = Number(choice)
    model.value = next
  },
})

const isActive = computed(
  () => model.value.onlyMine || model.value.hideOlderThan !== undefined || showPatch.value,
)

const summaryText = computed(() => {
  const parts: string[] = []
  if (model.value.onlyMine) parts.push('mine')
  const age = model.value.hideOlderThan
  if (age !== undefined) parts.push(`${age} ${age === 1 ? 'patch' : 'patches'}`)
  if (showPatch.value) parts.push('patch shown')
  return parts.join(', ')
})

/** A click anywhere else closes the panel, like a menu. */
function closeOnOutsideClick(event: MouseEvent): void {
  const element = panel.value
  if (element?.open && event.target instanceof Node && !element.contains(event.target)) {
    element.open = false
  }
}

onMounted(() => document.addEventListener('click', closeOnOutsideClick))
onUnmounted(() => document.removeEventListener('click', closeOnOutsideClick))
</script>
