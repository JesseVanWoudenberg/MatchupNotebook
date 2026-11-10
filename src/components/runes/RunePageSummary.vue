<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="flex items-center gap-1.5" :title="primaryName">
      <RuneIcon :id="page.primaryStyleId" kind="style" :size="24" />
      <span
        v-for="slot in PRIMARY_SLOTS"
        :key="slot"
        class="rounded-full"
        :class="[slot === 0 ? '' : '', brokenSlots.has(slot) ? BROKEN_RING : '']"
      >
        <RuneIcon :id="perkAt(slot)" :size="slot === 0 ? 40 : 32" />
      </span>
    </div>

    <span class="h-6 w-px bg-(--color-outline)" />

    <div class="flex items-center gap-1.5" :title="secondaryName">
      <RuneIcon :id="page.subStyleId" kind="style" :size="24" />
      <span
        v-for="slot in SECONDARY_SLOTS"
        :key="slot"
        class="rounded-full"
        :class="brokenSlots.has(slot) ? BROKEN_RING : ''"
      >
        <RuneIcon :id="perkAt(slot)" :size="32" />
      </span>
    </div>

    <span class="h-6 w-px bg-(--color-outline)" />

    <div class="flex items-center gap-1">
      <span
        v-for="slot in SHARD_SLOTS"
        :key="slot"
        class="rounded-full"
        :class="brokenSlots.has(slot) ? BROKEN_RING : ''"
      >
        <RuneIcon :id="perkAt(slot)" :size="24" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RunePage } from '@/schema'
import {
  PRIMARY_SLOTS,
  SECONDARY_SLOTS,
  SHARD_SLOTS,
  validateRuneSelection,
} from '@/model/runeRules'
import { useRuneStore } from '@/stores/runes'
import RuneIcon from './RuneIcon.vue'

/** A rune page as one row of icons. Slots the current data rejects get a red ring. */
const props = defineProps<{ page: RunePage }>()

const BROKEN_RING = 'ring-2 ring-(--color-danger)'

const runeStore = useRuneStore()

const primaryName = computed(
  () => runeStore.style(props.page.primaryStyleId)?.name ?? 'Primary tree',
)
const secondaryName = computed(
  () => runeStore.style(props.page.subStyleId)?.name ?? 'Secondary tree',
)

const brokenSlots = computed(() => {
  const broken = new Set<number>()
  for (const issue of validateRuneSelection(props.page, runeStore.snapshot)) {
    if (typeof issue.target === 'number') broken.add(issue.target)
  }
  return broken
})

function perkAt(slot: number): number {
  return props.page.selectedPerkIds[slot] ?? 0
}
</script>
