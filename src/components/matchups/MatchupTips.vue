<template>
  <div class="flex flex-col gap-4">
    <!-- Quiet toolbar: the list is the point, these are for now and then. -->
    <div class="flex items-center justify-end gap-2">
      <TipFilterBar
        v-if="hasAnyTips"
        v-model="filters"
        :show-patch="settingsStore.showTipPatch"
        @update:show-patch="setShowPatch"
      />
      <BaseButton v-if="!isAdding" variant="outlined" size="sm" @click="startAdding">
        <BaseIcon name="plus" :size="14" />
        Add tip
      </BaseButton>
    </div>

    <TipEditor
      v-if="isAdding"
      :view="view"
      :default-patch="defaultPatch"
      @save="saveNew"
      @cancel="isAdding = false"
    />

    <p
      v-if="visibleTips.length === 0 && !isAdding"
      class="rounded-lg border border-dashed border-(--color-outline) p-8 text-center text-sm text-(--color-on-surface-muted)"
    >
      {{ hasAnyTips ? 'Every tip here is hidden by the filters.' : emptyText }}
    </p>

    <!-- One matchup: tiers from most specific to general. -->
    <TipTierList
      v-if="!isGrouped"
      :tiers="groupTipsByTier(visibleTips)"
      :view="view"
      :editing-id="editingId"
      :show-patch="settingsStore.showTipPatch"
      @edit="editingId = $event.id"
      @remove="confirmRemove($event)"
    >
      <template #editor="{ tip }">
        <TipEditor
          :view="view"
          :tip="tip"
          :default-patch="defaultPatch"
          @save="saveEdit(tip, $event)"
          @cancel="editingId = undefined"
        />
      </template>
    </TipTierList>

    <!-- All matchups: one section per enemy, the champ-wide tips first. -->
    <div v-else class="flex flex-col gap-6">
      <section v-for="group in groups" :key="group.enemy ?? 'general'" class="flex flex-col gap-2">
        <MatchupGroupHeader
          :my-champ="myChamp"
          :enemy="group.enemy"
          @open="emit('openMatchup', $event)"
        />
        <TipTierList
          :tiers="[{ specificity: 0, tips: group.items }]"
          :view="viewFor(group.enemy)"
          :editing-id="editingId"
          :show-patch="settingsStore.showTipPatch"
          :show-tier-labels="false"
          @edit="editingId = $event.id"
          @remove="confirmRemove($event)"
        >
          <template #editor="{ tip }">
            <TipEditor
              :view="viewFor(group.enemy)"
              :tip="tip"
              :default-patch="defaultPatch"
              @save="saveEdit(tip, $event)"
              @cancel="editingId = undefined"
            />
          </template>
        </TipTierList>
      </section>
    </div>

    <BaseDialog v-model:open="isConfirmingRemove" title="Delete this tip?">
      <p class="selectable">{{ tipToRemove?.text }}</p>
      <template #actions>
        <BaseButton variant="text" @click="isConfirmingRemove = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="removeConfirmed">Delete</BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChampId, Tip, Uuid } from '@/schema'
import { BaseButton, BaseDialog, BaseIcon } from '@/components/base'
import TipEditor from '@/components/tips/TipEditor.vue'
import TipFilterBar from '@/components/tips/TipFilterBar.vue'
import TipTierList from '@/components/tips/TipTierList.vue'
import { useToast } from '@/composables/useToast'
import type { NewTipInput } from '@/model/factories'
import {
  NO_FILTERS,
  applyTipFilters,
  groupTipsByTier,
  tipsForScope,
  type ScopeFilter,
  type TipListFilters,
} from '@/model/matchup'
import { groupByEnemy } from '@/model/matchups'
import { useChampionStore } from '@/stores/champions'
import { useNotebookStore } from '@/stores/notebook'
import { useSettingsStore } from '@/stores/settings'
import MatchupGroupHeader from './MatchupGroupHeader.vue'

/**
 * The tips for one matchup: filters, tiers, inline add, edit and delete.
 * With `includeNarrower` on a champ page it switches to one section per
 * enemy. Used by the matchup page and by the review page, where new tips
 * are linked to the review being written.
 */
const props = withDefaults(
  defineProps<{
    view: ScopeFilter
    /** Also list items scoped to enemies when the view has none, grouped per enemy. */
    includeNarrower?: boolean
    /** Tips added here get linked to this review. */
    reviewId?: Uuid
    emptyText?: string
  }>(),
  { includeNarrower: false, emptyText: 'No tips for this matchup yet. Add the first one.' },
)

const emit = defineEmits<{ openMatchup: [enemy: ChampId] }>()

const toast = useToast()
const championStore = useChampionStore()
const notebookStore = useNotebookStore()

const FALLBACK_PATCH = '0.0'

const settingsStore = useSettingsStore()
const filters = ref<TipListFilters>(NO_FILTERS)

/** Remembered across matchups, unlike the filters, which reset per page. */
async function setShowPatch(enabled: boolean): Promise<void> {
  try {
    await settingsStore.setShowTipPatch(enabled)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Could not save the setting.')
  }
}
const tipsInView = computed(() =>
  tipsForScope(notebookStore.tips, props.view, { includeNarrower: props.includeNarrower }),
)
const hasAnyTips = computed(() => tipsInView.value.length > 0)
const visibleTips = computed(() =>
  applyTipFilters(
    tipsInView.value,
    filters.value,
    championStore.currentPatch,
    championStore.knownPatches,
  ),
)
const isGrouped = computed(() => props.includeNarrower && props.view.enemy === undefined)
const groups = computed(() => groupByEnemy(visibleTips.value, championStore.nameOf))
const myChamp = computed(() => props.view.myChamp ?? '')
const defaultPatch = computed(() => championStore.currentPatch ?? FALLBACK_PATCH)

/** Inside an enemy's section the cards are read as that matchup, so its portrait is not repeated. */
function viewFor(enemy: ChampId | undefined): ScopeFilter {
  return enemy ? { ...props.view, enemy } : props.view
}

const isAdding = ref(false)
const editingId = ref<string>()
const tipToRemove = ref<Tip>()
const isConfirmingRemove = ref(false)

function report(error: unknown, fallback: string): void {
  toast.error(error instanceof Error ? error.message : fallback)
}

function startAdding(): void {
  editingId.value = undefined
  isAdding.value = true
}

async function saveNew(input: NewTipInput): Promise<void> {
  try {
    await notebookStore.addTip(props.reviewId ? { ...input, reviewId: props.reviewId } : input)
    isAdding.value = false
  } catch (error: unknown) {
    report(error, 'Could not save the tip.')
  }
}

async function saveEdit(tip: Tip, input: NewTipInput): Promise<void> {
  try {
    await notebookStore.updateTip(tip.id, input)
    editingId.value = undefined
  } catch (error: unknown) {
    report(error, 'Could not save the tip.')
  }
}

function confirmRemove(tip: Tip): void {
  tipToRemove.value = tip
  isConfirmingRemove.value = true
}

async function removeConfirmed(): Promise<void> {
  const tip = tipToRemove.value
  isConfirmingRemove.value = false
  if (!tip) return
  try {
    await notebookStore.removeTip(tip.id)
  } catch (error: unknown) {
    report(error, 'Could not delete the tip.')
  }
}
</script>
