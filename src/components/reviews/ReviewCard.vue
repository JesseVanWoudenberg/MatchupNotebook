<template>
  <article
    class="group flex items-start gap-3 rounded-lg border border-(--color-outline) bg-(--color-surface) px-3 py-2.5"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-2 text-xs text-(--color-on-surface-muted)">
        <span>{{ playedOn }}</span>
        <TipScopeIcons :scope="review.scope" :view="view" />
        <span v-if="linkedTipCount > 0">
          {{ linkedTipCount }} {{ linkedTipCount === 1 ? 'tip' : 'tips' }}
        </span>
      </div>
      <p class="selectable text-sm leading-relaxed whitespace-pre-wrap">{{ review.text }}</p>
    </div>
    <span
      class="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
    >
      <BaseButton
        variant="text"
        size="sm"
        aria-label="Open review"
        title="Open"
        @click="emit('open')"
      >
        <BaseIcon name="pencil" :size="15" />
      </BaseButton>
      <BaseButton
        variant="danger"
        size="sm"
        aria-label="Delete review"
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
import type { Review } from '@/schema'
import { BaseButton, BaseIcon } from '@/components/base'
import TipScopeIcons from '@/components/tips/TipScopeIcons.vue'
import type { ScopeFilter } from '@/model/matchup'
import { tipsFromReview } from '@/model/reviews'
import { useNotebookStore } from '@/stores/notebook'

const props = defineProps<{ review: Review; view: ScopeFilter }>()

const emit = defineEmits<{ open: []; remove: [] }>()

const notebookStore = useNotebookStore()

// System locale on purpose: no hand-built date strings.
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

const playedOn = computed(() => dateFormat.format(new Date(props.review.createdAt)))
const linkedTipCount = computed(() => tipsFromReview(notebookStore.tips, props.review.id).length)
</script>
