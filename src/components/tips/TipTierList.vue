<template>
  <div class="flex flex-col gap-6">
    <section v-for="tier in tiers" :key="tier.specificity" class="flex flex-col gap-2">
      <h2
        v-if="showTierLabels"
        class="text-xs font-semibold tracking-wide text-(--color-on-surface-muted) uppercase"
      >
        {{ tierLabel(tier.specificity) }}
      </h2>
      <template v-for="tip in tier.tips" :key="tip.id">
        <slot v-if="tip.id === editingId" name="editor" :tip="tip" />
        <TipCard
          v-else
          :tip="tip"
          :view="view"
          :show-patch="showPatch"
          @edit="emit('edit', tip)"
          @remove="emit('remove', tip)"
        />
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Tip } from '@/schema'
import type { ScopeFilter, TipTier } from '@/model/matchup'
import { tierLabel } from '@/model/labels'
import TipCard from './TipCard.vue'

withDefaults(
  defineProps<{
    tiers: TipTier[]
    view: ScopeFilter
    /** The tip currently being edited is replaced by the editor slot. */
    editingId?: string
    showTierLabels?: boolean
    /** Print each tip's patch on its card. */
    showPatch?: boolean
  }>(),
  { showTierLabels: true, showPatch: false },
)

const emit = defineEmits<{
  edit: [tip: Tip]
  remove: [tip: Tip]
}>()
</script>
