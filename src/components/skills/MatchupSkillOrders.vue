<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-4">
      <p class="flex-1 text-sm text-(--color-on-surface-muted)">
        {{
          orders.length === 0
            ? 'No skill order for this matchup yet.'
            : 'The first one is shown for this matchup.'
        }}
      </p>
      <BaseButton variant="outlined" size="sm" @click="emit('create')">
        <BaseIcon name="plus" :size="14" />
        New skill order
      </BaseButton>
    </div>

    <template v-for="group in groups" :key="group.enemy ?? 'general'">
      <MatchupGroupHeader
        v-if="isGrouped"
        :my-champ="view.myChamp"
        :enemy="group.enemy"
        @open="emit('openMatchup', $event)"
      />
      <article
        v-for="(order, index) in group.items"
        :key="order.id"
        class="group flex flex-wrap items-center gap-4 rounded-lg border bg-(--color-surface) px-4 py-3"
        :class="index === 0 && !isGrouped ? 'border-(--color-primary)' : 'border-(--color-outline)'"
      >
        <div class="flex min-w-0 items-center gap-2 text-sm font-medium">
          <span>{{ order.name }}</span>
          <TipScopeIcons :scope="order.scope" :view="viewFor(group.enemy)" />
        </div>
        <SkillOrderSummary :levels="order.levels" />
        <div class="flex-1" />
        <span
          class="flex items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        >
          <BaseButton
            variant="text"
            size="sm"
            aria-label="Edit skill order"
            title="Edit"
            @click="emit('edit', order)"
          >
            <BaseIcon name="pencil" :size="15" />
          </BaseButton>
          <BaseButton
            variant="danger"
            size="sm"
            aria-label="Delete skill order"
            title="Delete"
            @click="confirmRemove(order)"
          >
            <BaseIcon name="trash" :size="15" />
          </BaseButton>
        </span>
      </article>
    </template>

    <BaseDialog v-model:open="isConfirmingRemove" title="Delete this skill order?">
      <p>{{ orderToRemove?.name }}</p>
      <template #actions>
        <BaseButton variant="text" @click="isConfirmingRemove = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="removeConfirmed">Delete</BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChampId, MatchupScope, SkillOrder } from '@/schema'
import { BaseButton, BaseDialog, BaseIcon } from '@/components/base'
import TipScopeIcons from '@/components/tips/TipScopeIcons.vue'
import MatchupGroupHeader from '@/components/matchups/MatchupGroupHeader.vue'
import { useToast } from '@/composables/useToast'
import { groupByEnemy } from '@/model/matchups'
import { skillOrdersForView } from '@/model/skillOrders'
import { useChampionStore } from '@/stores/champions'
import { useNotebookStore } from '@/stores/notebook'
import SkillOrderSummary from './SkillOrderSummary.vue'

/** The skill orders that fit the matchup being viewed, best first. */
const props = withDefaults(
  defineProps<{
    view: MatchupScope
    /** Also list items scoped to enemies when the view has none. */
    includeNarrower?: boolean
  }>(),
  { includeNarrower: false },
)

const emit = defineEmits<{
  edit: [order: SkillOrder]
  create: []
  openMatchup: [enemy: ChampId]
}>()

const toast = useToast()
const notebookStore = useNotebookStore()

const orders = computed(() =>
  skillOrdersForView(notebookStore.skillOrders, props.view, {
    includeNarrower: props.includeNarrower,
  }),
)

const championStore = useChampionStore()
const isGrouped = computed(() => props.includeNarrower && props.view.enemy === undefined)
/** One section per enemy when showing all matchups, otherwise a single unnamed group. */
const groups = computed(() =>
  isGrouped.value
    ? groupByEnemy(orders.value, championStore.nameOf)
    : [{ enemy: undefined, items: orders.value }],
)

/** Inside an enemy's section the cards are read as that matchup, so its portrait is not repeated. */
function viewFor(enemy: ChampId | undefined): MatchupScope {
  return enemy ? { ...props.view, enemy } : props.view
}

const orderToRemove = ref<SkillOrder>()
const isConfirmingRemove = ref(false)

function confirmRemove(order: SkillOrder): void {
  orderToRemove.value = order
  isConfirmingRemove.value = true
}

async function removeConfirmed(): Promise<void> {
  const order = orderToRemove.value
  isConfirmingRemove.value = false
  if (!order) return
  try {
    await notebookStore.removeSkillOrder(order.id)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Could not delete the skill order.')
  }
}
</script>
