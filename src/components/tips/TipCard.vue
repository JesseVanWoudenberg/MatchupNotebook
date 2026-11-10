<template>
  <article
    class="group flex items-start gap-3 rounded-lg border border-(--color-outline) bg-(--color-surface) px-3 py-2.5"
  >
    <span
      class="flex h-6 w-5 shrink-0 items-center justify-center text-(--color-on-surface-muted)"
      :title="KIND_LABELS[tip.kind]"
      :aria-label="KIND_LABELS[tip.kind]"
    >
      <BaseIcon v-if="kindIcon" :name="kindIcon" :size="16" />
    </span>

    <p class="selectable min-w-0 flex-1 py-0.5 text-sm leading-relaxed whitespace-pre-wrap">
      {{ tip.text }}
    </p>

    <!-- Fixed-width meta column so every card lines up. -->
    <div class="flex w-36 shrink-0 items-center justify-end gap-2">
      <BaseBadge v-if="!isMine(tip)" tone="imported">{{ tip.origin.authorName }}</BaseBadge>
      <TipScopeIcons :scope="tip.scope" :view="view" />
      <span
        v-if="showPatch"
        class="w-10 text-right text-[11px] text-(--color-on-surface-muted)"
        :title="isOlderPatch ? `Written on patch ${tip.patch}, before the current one` : undefined"
      >
        {{ tip.patch }}
      </span>
    </div>

    <span
      class="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
    >
      <BaseButton variant="text" size="sm" aria-label="Edit tip" title="Edit" @click="emit('edit')">
        <BaseIcon name="pencil" :size="15" />
      </BaseButton>
      <BaseButton
        variant="danger"
        size="sm"
        aria-label="Delete tip"
        title="Delete"
        @click="emit('remove')"
      >
        <BaseIcon name="trash" :size="15" />
      </BaseButton>
    </span>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Tip } from '@/schema'
import { BaseBadge, BaseButton, BaseIcon } from '@/components/base'
import { isMine, type ScopeFilter } from '@/model/matchup'
import { KIND_LABELS } from '@/model/labels'
import { useChampionStore } from '@/stores/champions'
import { KIND_ICONS } from './tipKindIcons'
import TipScopeIcons from './TipScopeIcons.vue'

const props = withDefaults(
  defineProps<{
    tip: Tip
    /** The matchup being viewed. Scope icons only show the parts that differ from it. */
    view: ScopeFilter
    /** Print the patch the tip was written on. Off by default, on from the filter panel. */
    showPatch?: boolean
  }>(),
  { showPatch: false },
)

const emit = defineEmits<{ edit: []; remove: [] }>()

const championStore = useChampionStore()

const kindIcon = computed(() => KIND_ICONS[props.tip.kind])

/** The patch is only worth showing when it is not the current one. */
const isOlderPatch = computed(
  () => championStore.currentPatch !== undefined && props.tip.patch !== championStore.currentPatch,
)
</script>
