<template>
  <PageShell
    v-if="!championStore.get(scope.myChamp)"
    title="Unknown champion"
    back
    @back="router.back()"
  >
    <p class="text-sm text-(--color-on-surface-muted)">This champion is not in the current data.</p>
  </PageShell>

  <PageShell v-else-if="isMissing" title="Rune page not found" back @back="router.back()">
    <p class="text-sm text-(--color-on-surface-muted)">It may have been deleted.</p>
  </PageShell>

  <PageShell v-else :title="pageTitle" back @back="leave">
    <MatchupScopeHeader :scope="scope" @update:scope="scope = $event" />

    <RunePageEditor
      :view="scope"
      :page="existing"
      :default-patch="defaultPatch"
      @save="save"
      @cancel="leave"
    />
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { MatchupScope } from '@/schema'
import { PageShell } from '@/components/composite'
import MatchupScopeHeader from '@/components/matchups/MatchupScopeHeader.vue'
import RunePageEditor from '@/components/runes/RunePageEditor.vue'
import { useToast } from '@/composables/useToast'
import type { NewRunePageInput } from '@/model/factories'
import { describeScope } from '@/model/labels'
import { matchupRoute } from '@/router/matchupRoute'
import { scopeFromRoute } from '@/router/scopeFromRoute'
import { useChampionStore } from '@/stores/champions'
import { useNotebookStore } from '@/stores/notebook'

/**
 * /rune-page/new/:myChamp/:enemy? builds a page for the matchup in the
 * route. /rune-page/:id edits a saved one, taking the matchup from it.
 */
const route = useRoute()
const router = useRouter()
const toast = useToast()
const championStore = useChampionStore()
const notebookStore = useNotebookStore()

const FALLBACK_PATCH = '0.0'

const existingId = computed(() =>
  typeof route.params.id === 'string' ? route.params.id : undefined,
)
const existing = computed(() =>
  existingId.value ? notebookStore.getRunePage(existingId.value) : undefined,
)
const isMissing = computed(() => existingId.value !== undefined && existing.value === undefined)

const scope = ref<MatchupScope>(
  existing.value ? { ...existing.value.scope } : scopeFromRoute(route),
)
const pageTitle = computed(() => {
  const matchup = describeScope(scope.value, championStore.nameOf)
  return existing.value ? `Rune page: ${matchup}` : `New rune page: ${matchup}`
})
const defaultPatch = computed(() => championStore.currentPatch ?? FALLBACK_PATCH)

function leave(): void {
  void router.push(matchupRoute('Matchup', { ...scope.value, tab: 'runes' }))
}

async function save(input: NewRunePageInput): Promise<void> {
  try {
    if (existing.value) await notebookStore.updateRunePage(existing.value.id, input)
    else await notebookStore.addRunePage(input)
    leave()
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Could not save the rune page.')
  }
}
</script>
