<template>
  <img
    v-if="isKnown"
    :src="url"
    :alt="name"
    :title="name"
    :width="size"
    :height="size"
    class="shrink-0 rounded-full object-contain"
    :class="{ 'opacity-40 grayscale': dimmed }"
    draggable="false"
  />
  <span
    v-else
    :title="`Unknown rune ${id}`"
    class="flex shrink-0 items-center justify-center rounded-full border border-dashed border-(--color-danger) text-(--color-danger)"
    :style="undefined"
    :class="SIZE_CLASSES[size] ?? ''"
  >
    <BaseIcon name="help" :size="Math.round(size * 0.55)" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BaseIcon } from '@/components/base'
import { SHARD_NAMES } from '@/data/runes'
import { useRuneStore } from '@/stores/runes'

/** A perk, shard or tree icon by id. Unknown ids get a dashed placeholder instead of a broken image. */
const props = withDefaults(
  defineProps<{
    id: number
    kind?: 'perk' | 'style'
    size?: 24 | 32 | 40 | 48
    dimmed?: boolean
  }>(),
  { kind: 'perk', size: 32, dimmed: false },
)

const SIZE_CLASSES: Record<number, string> = {
  24: 'h-6 w-6',
  32: 'h-8 w-8',
  40: 'h-10 w-10',
  48: 'h-12 w-12',
}

const runeStore = useRuneStore()

const isKnown = computed(() =>
  props.kind === 'style'
    ? runeStore.style(props.id) !== undefined
    : runeStore.perk(props.id) !== undefined || SHARD_NAMES[props.id] !== undefined,
)
const name = computed(() =>
  props.kind === 'style'
    ? (runeStore.style(props.id)?.name ?? String(props.id))
    : runeStore.nameOf(props.id),
)
const url = computed(() =>
  props.kind === 'style' ? runeStore.styleIconUrl(props.id) : runeStore.perkIconUrl(props.id),
)
</script>
