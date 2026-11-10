<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-4">
      <p class="flex-1 text-sm text-(--color-on-surface-muted)">
        {{
          pages.length === 0
            ? 'No rune page for this matchup yet.'
            : 'The first one is shown for this matchup.'
        }}
      </p>
      <BaseButton variant="outlined" size="sm" @click="emit('create')">
        <BaseIcon name="plus" :size="14" />
        New rune page
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
        v-for="(page, index) in group.items"
        :key="page.id"
        class="group flex flex-wrap items-center gap-4 rounded-lg border bg-(--color-surface) px-4 py-3"
        :class="index === 0 && !isGrouped ? 'border-(--color-primary)' : 'border-(--color-outline)'"
      >
        <div class="flex min-w-0 items-center gap-2 text-sm font-medium">
          <span>{{ page.name }}</span>
          <TipScopeIcons :scope="page.scope" :view="viewFor(group.enemy)" />
          <BaseBadge v-if="needsUpdate(page)" tone="danger">
            <BaseIcon name="alert-triangle" :size="12" />
            Needs update
          </BaseBadge>
        </div>
        <RunePageSummary :page="page" />
        <div class="flex-1" />
        <BaseButton
          variant="outlined"
          size="sm"
          :disabled="!canSend(page)"
          :title="sendTitle(page)"
          @click="send(page)"
        >
          <BaseIcon name="send" :size="14" />
          {{ sendingId === page.id ? 'Sending…' : 'Send to client' }}
        </BaseButton>
        <span
          class="flex items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        >
          <BaseButton
            variant="text"
            size="sm"
            aria-label="Edit page"
            title="Edit"
            @click="emit('edit', page)"
          >
            <BaseIcon name="pencil" :size="15" />
          </BaseButton>
          <BaseButton
            variant="danger"
            size="sm"
            aria-label="Delete page"
            title="Delete"
            @click="confirmRemove(page)"
          >
            <BaseIcon name="trash" :size="15" />
          </BaseButton>
        </span>
      </article>
    </template>

    <BaseDialog v-model:open="isConfirmingRemove" title="Delete this rune page?">
      <p>{{ pageToRemove?.name }}</p>
      <template #actions>
        <BaseButton variant="text" @click="isConfirmingRemove = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="removeConfirmed">Delete</BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChampId, MatchupScope, RunePage, Uuid } from '@/schema'
import { BaseBadge, BaseButton, BaseDialog, BaseIcon } from '@/components/base'
import TipScopeIcons from '@/components/tips/TipScopeIcons.vue'
import MatchupGroupHeader from '@/components/matchups/MatchupGroupHeader.vue'
import { useToast } from '@/composables/useToast'
import { SEND_OUTCOME_MESSAGES } from '@/data/leagueClient'
import { groupByEnemy } from '@/model/matchups'
import { runePageNeedsUpdate, runePagesForView } from '@/model/runePages'
import { useChampionStore } from '@/stores/champions'
import { useClientStore } from '@/stores/client'
import { useNotebookStore } from '@/stores/notebook'
import { useRuneStore } from '@/stores/runes'
import RunePageSummary from './RunePageSummary.vue'

/** The rune pages that fit the matchup being viewed, best first. */
const props = withDefaults(
  defineProps<{
    view: MatchupScope
    /** Also list items scoped to enemies when the view has none. */
    includeNarrower?: boolean
  }>(),
  { includeNarrower: false },
)

const emit = defineEmits<{
  edit: [page: RunePage]
  create: []
  openMatchup: [enemy: ChampId]
}>()

const toast = useToast()
const notebookStore = useNotebookStore()
const runeStore = useRuneStore()
const clientStore = useClientStore()

const pages = computed(() =>
  runePagesForView(notebookStore.runePages, props.view, { includeNarrower: props.includeNarrower }),
)

const championStore = useChampionStore()
const isGrouped = computed(() => props.includeNarrower && props.view.enemy === undefined)
/** One section per enemy when showing all matchups, otherwise a single unnamed group. */
const groups = computed(() =>
  isGrouped.value
    ? groupByEnemy(pages.value, championStore.nameOf)
    : [{ enemy: undefined, items: pages.value }],
)

/** Inside an enemy's section the cards are read as that matchup, so its portrait is not repeated. */
function viewFor(enemy: ChampId | undefined): MatchupScope {
  return enemy ? { ...props.view, enemy } : props.view
}

function needsUpdate(page: RunePage): boolean {
  return runePageNeedsUpdate(page, runeStore.snapshot)
}

// Send to client: the one write to the League client, only ever from this button.
const sendingId = ref<Uuid>()

function canSend(page: RunePage): boolean {
  return clientStore.isConnected && !needsUpdate(page) && sendingId.value === undefined
}

function sendTitle(page: RunePage): string {
  if (!clientStore.isConnected) return 'The League client is not running.'
  if (needsUpdate(page)) return 'Fix the page first.'
  return 'Put this page in the client as your current rune page.'
}

async function send(page: RunePage): Promise<void> {
  sendingId.value = page.id
  try {
    const outcome = await clientStore.sendRunePage(page)
    toast.show(SEND_OUTCOME_MESSAGES[outcome])
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Could not send the rune page.')
  } finally {
    sendingId.value = undefined
  }
}

const pageToRemove = ref<RunePage>()
const isConfirmingRemove = ref(false)

function confirmRemove(page: RunePage): void {
  pageToRemove.value = page
  isConfirmingRemove.value = true
}

async function removeConfirmed(): Promise<void> {
  const page = pageToRemove.value
  isConfirmingRemove.value = false
  if (!page) return
  try {
    await notebookStore.removeRunePage(page.id)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Could not delete the rune page.')
  }
}
</script>
