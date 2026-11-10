<template>
  <PageShell
    v-if="!championStore.get(scope.myChamp)"
    title="Unknown champion"
    back
    @back="router.back()"
  >
    <p class="text-sm text-(--color-on-surface-muted)">This champion is not in the current data.</p>
  </PageShell>

  <PageShell v-else-if="isMissing" title="Review not found" back @back="router.back()">
    <p class="text-sm text-(--color-on-surface-muted)">It may have been deleted.</p>
  </PageShell>

  <PageShell v-else :title="pageTitle" back @back="leave">
    <template #actions>
      <BaseButton
        v-if="aiStore.isEnabled"
        variant="outlined"
        :disabled="text.trim() === '' || !aiStore.isReady"
        :title="suggestTitle"
        @click="isSuggesting = true"
      >
        <BaseIcon name="sparkles" :size="16" />
        Suggest changes
      </BaseButton>
      <BaseButton variant="text" @click="leave">Cancel</BaseButton>
      <BaseButton :disabled="isSaving" @click="save">
        <BaseIcon name="check" :size="16" />
        {{ existing ? 'Save' : 'Save review' }}
      </BaseButton>
    </template>

    <MatchupScopeHeader :scope="scope" @update:scope="scope = $event" />

    <AiSuggestDialog v-model:open="isSuggesting" :context="aiContext" :review-id="reviewId" />

    <ClientEnemyButtons
      v-if="lastGameEnemies"
      label="From your last game"
      :enemies="lastGameEnemies"
      :current="scope.enemy"
      @select="chooseEnemy"
    />

    <section class="flex flex-col gap-2">
      <h2 class="text-xs font-semibold tracking-wide text-(--color-on-surface-muted) uppercase">
        How did it go?
      </h2>
      <BaseTextArea
        v-model="text"
        :rows="6"
        placeholder="What happened, what worked, what you would do differently."
        autofocus
        :error="textError"
      />
      <p class="flex items-center gap-1.5 text-xs text-(--color-on-surface-muted)">
        <BaseIcon name="mic" :size="13" />
        Prefer talking? Press Win+H to dictate with Windows voice typing.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-xs font-semibold tracking-wide text-(--color-on-surface-muted) uppercase">
        Your tips for this matchup
      </h2>
      <p class="text-sm text-(--color-on-surface-muted)">
        Change them while it is fresh. Tips you add here are linked to this review.
      </p>
      <MatchupTips
        :view="scope"
        :review-id="reviewId"
        empty-text="No tips yet. Add what you want to remember next time."
      />
    </section>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ChampId, MatchupScope } from '@/schema'
import { BaseButton, BaseIcon, BaseTextArea } from '@/components/base'
import { PageShell } from '@/components/composite'
import AiSuggestDialog from '@/components/ai/AiSuggestDialog.vue'
import ClientEnemyButtons from '@/components/client/ClientEnemyButtons.vue'
import MatchupScopeHeader from '@/components/matchups/MatchupScopeHeader.vue'
import MatchupTips from '@/components/matchups/MatchupTips.vue'
import { useToast } from '@/composables/useToast'
import type { AiReviewContext } from '@/model/aiSuggestions'
import { describeScope } from '@/model/labels'
import { tipsForScope } from '@/model/matchup'
import { matchupRoute } from '@/router/matchupRoute'
import { scopeFromRoute } from '@/router/scopeFromRoute'
import { useAiStore } from '@/stores/ai'
import { useChampionStore } from '@/stores/champions'
import { useClientStore } from '@/stores/client'
import { useNotebookStore } from '@/stores/notebook'

/**
 * Two ways in: /review/new/:myChamp/:enemy? for a new review, taking the
 * matchup from the route; /review/:id to reopen a saved one, taking the
 * matchup from the review itself. A new review gets its id before it is
 * saved, so tips written meanwhile can link to it.
 */
const route = useRoute()
const router = useRouter()
const toast = useToast()
const championStore = useChampionStore()
const notebookStore = useNotebookStore()
const clientStore = useClientStore()
const aiStore = useAiStore()

const FALLBACK_PATCH = '0.0'

const existingId = computed(() =>
  typeof route.params.id === 'string' ? route.params.id : undefined,
)
const existing = computed(() =>
  existingId.value ? notebookStore.getReview(existingId.value) : undefined,
)
const isMissing = computed(() => existingId.value !== undefined && existing.value === undefined)

const draftId = notebookStore.newId()
const reviewId = computed(() => existing.value?.id ?? draftId)

// The matchup is editable on the page, so it lives in local state seeded from
// the route or the saved review.
/**
 * A new review of the game just played starts on the enemy you clicked in
 * champ select, when the route does not name one. Never a guess.
 */
function initialScope(): MatchupScope {
  if (existing.value) return { ...existing.value.scope }
  const fromRoute = scopeFromRoute(route)
  const game = clientStore.lastGame
  if (fromRoute.enemy === undefined && game?.myChamp === fromRoute.myChamp && game.opponent) {
    return { ...fromRoute, enemy: game.opponent }
  }
  return fromRoute
}

const scope = ref<MatchupScope>(initialScope())

const pageTitle = computed(() => {
  const matchup = describeScope(scope.value, championStore.nameOf)
  return existing.value ? `Review: ${matchup}` : `New review: ${matchup}`
})

/** Enemy picks the client saw in the game just played, for a new review of that champ. */
const lastGameEnemies = computed(() => {
  const game = clientStore.lastGame
  if (existing.value || !game || game.myChamp !== scope.value.myChamp) return undefined
  return game.enemies.length > 0 ? game.enemies : undefined
})

function chooseEnemy(enemy: ChampId): void {
  scope.value = { ...scope.value, enemy }
}

const text = ref(existing.value?.text ?? '')
const textError = ref<string>()
const isSaving = ref(false)

// The AI add-on, when turned on in Settings: proposals for the tips on this page.
const isSuggesting = ref(false)
const aiContext = computed<AiReviewContext>(() => ({
  scope: scope.value,
  reviewText: text.value,
  tips: tipsForScope(notebookStore.tips, scope.value),
  patch: championStore.currentPatch ?? FALLBACK_PATCH,
}))
const suggestTitle = computed(() => {
  if (!aiStore.isReady) return 'Add an API key in Settings first.'
  if (text.value.trim() === '') return 'Write the review first.'
  return 'Ask the AI what to change in your tips, then approve each line.'
})

function leave(): void {
  void router.push(matchupRoute('Matchup', scope.value))
}

async function save(): Promise<void> {
  textError.value = text.value.trim() === '' ? 'Write how the game went first.' : undefined
  if (textError.value) return

  isSaving.value = true
  try {
    if (existing.value) {
      await notebookStore.updateReview(existing.value.id, {
        scope: scope.value,
        text: text.value.trim(),
      })
    } else {
      await notebookStore.addReview({
        id: draftId,
        scope: scope.value,
        text: text.value.trim(),
        patch: championStore.currentPatch ?? FALLBACK_PATCH,
      })
    }
    leave()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Could not save the review.')
  } finally {
    isSaving.value = false
  }
}
</script>
