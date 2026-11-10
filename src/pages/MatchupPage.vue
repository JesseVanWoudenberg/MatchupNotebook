<template>
  <PageShell v-if="!championStore.get(scope.myChamp)" title="Unknown champion" back @back="goHome">
    <p class="text-sm text-(--color-on-surface-muted)">
      This champion is not in the current data. Pick another one.
    </p>
  </PageShell>

  <PageShell v-else :title="pageTitle" back @back="goHome">
    <template #actions>
      <BaseButton
        variant="outlined"
        aria-label="Share tips"
        title="Share tips as a file"
        @click="isSharing = true"
      >
        <BaseIcon name="share" :size="16" />
      </BaseButton>
      <BaseButton variant="outlined" @click="openReviews">
        <BaseIcon name="book-open" :size="16" />
        Reviews
        <span v-if="reviewCount > 0" class="text-(--color-on-surface-muted)">{{
          reviewCount
        }}</span>
      </BaseButton>
      <BaseButton @click="startReview">
        <BaseIcon name="plus" :size="16" />
        New review
      </BaseButton>
    </template>

    <MatchupScopeHeader :scope="scope" @update:scope="navigate" />

    <ShareDialog v-model:open="isSharing" :scope="scope" />

    <ClientEnemyButtons
      v-if="champSelectEnemies"
      label="In champ select"
      :enemies="champSelectEnemies"
      :current="scope.enemy"
      @select="pickChampSelectEnemy"
    />

    <MatchupStrip
      :my-champ="scope.myChamp"
      :current="scope.enemy"
      :role="scope.role"
      @select="openMatchup"
    />

    <div class="flex flex-wrap items-end gap-4">
      <BaseTabs v-model="tab" :tabs="tabs" class="flex-1" />
      <BaseToggle
        v-if="!scope.enemy"
        v-model="includeNarrower"
        class="pb-2"
        title="Also list what you wrote for specific enemies, grouped per matchup"
      >
        Show all matchups
      </BaseToggle>
    </div>

    <MatchupTips
      v-if="tab === 'tips'"
      :view="scope"
      :include-narrower="includeNarrower"
      @open-matchup="openMatchup"
    />
    <MatchupRunes
      v-else-if="tab === 'runes'"
      :view="scope"
      :include-narrower="includeNarrower"
      @edit="editRunePage"
      @create="createRunePage"
      @open-matchup="openMatchup"
    />
    <AbilityPanel
      v-else-if="tab === 'numbers' && scope.enemy"
      :champ="scope.enemy"
      :my-champ="scope.myChamp"
    />
    <AbilityPanel v-else-if="tab === 'numbers'" :champ="scope.myChamp" />
    <MatchupSkillOrders
      v-else
      :view="scope"
      :include-narrower="includeNarrower"
      @edit="editSkillOrder"
      @create="createSkillOrder"
      @open-matchup="openMatchup"
    />
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ChampId, MatchupScope, RunePage, SkillOrder } from '@/schema'
import { BaseButton, BaseIcon, BaseTabs, BaseToggle, type TabOption } from '@/components/base'
import { PageShell } from '@/components/composite'
import AbilityPanel from '@/components/abilities/AbilityPanel.vue'
import ClientEnemyButtons from '@/components/client/ClientEnemyButtons.vue'
import MatchupScopeHeader from '@/components/matchups/MatchupScopeHeader.vue'
import MatchupStrip from '@/components/matchups/MatchupStrip.vue'
import ShareDialog from '@/components/sharing/ShareDialog.vue'
import MatchupTips from '@/components/matchups/MatchupTips.vue'
import MatchupRunes from '@/components/runes/MatchupRunes.vue'
import MatchupSkillOrders from '@/components/skills/MatchupSkillOrders.vue'
import { describeScope } from '@/model/labels'
import { tipsForScope } from '@/model/matchup'
import { reviewsForView } from '@/model/reviews'
import { runePageNeedsUpdate, runePagesForView } from '@/model/runePages'
import { skillOrdersForView } from '@/model/skillOrders'
import { MATCHUP_TABS, matchupRoute, type MatchupTab } from '@/router/matchupRoute'
import { scopeFromRoute } from '@/router/scopeFromRoute'
import { useChampionStore } from '@/stores/champions'
import { useClientStore } from '@/stores/client'
import { useNotebookStore } from '@/stores/notebook'
import { useRuneStore } from '@/stores/runes'

const route = useRoute()
const router = useRouter()
const championStore = useChampionStore()
const notebookStore = useNotebookStore()
const runeStore = useRuneStore()
const clientStore = useClientStore()
const isSharing = ref(false)

const scope = computed<MatchupScope>(() => scopeFromRoute(route))
const pageTitle = computed(() => describeScope(scope.value, championStore.nameOf))
const reviewCount = computed(() => reviewsForView(notebookStore.reviews, scope.value).length)

/** The enemies locked in so far, while champ select is on and this is your champ. */
const champSelectEnemies = computed(() => {
  const state = clientStore.champSelect
  if (!state || (state.myChamp !== undefined && state.myChamp !== scope.value.myChamp))
    return undefined
  return state.enemies
})

/** Off by default: a champ page shows only champ-wide items unless asked. Kept in the URL. */
const includeNarrower = computed<boolean>({
  get: () => route.query.all === '1',
  set: (next) => {
    void router.replace(matchupRoute('Matchup', { ...scope.value, tab: tab.value, all: next }))
  },
})
const fit = computed(() => ({ includeNarrower: includeNarrower.value }))

const runePages = computed(() => runePagesForView(notebookStore.runePages, scope.value, fit.value))
const hasBrokenRunePage = computed(() =>
  runePages.value.some((page) => runePageNeedsUpdate(page, runeStore.snapshot)),
)

/** The tab lives in the URL so editors and the back button return to it. */
const tab = computed<MatchupTab>({
  get: () => {
    const value = route.query.tab
    return typeof value === 'string' && (MATCHUP_TABS as readonly string[]).includes(value)
      ? (value as MatchupTab)
      : 'tips'
  },
  set: (next) => {
    void router.replace(
      matchupRoute('Matchup', { ...scope.value, tab: next, all: includeNarrower.value }),
    )
  },
})

const tabs = computed<TabOption[]>(() => [
  {
    value: 'tips',
    label: 'Tips',
    icon: 'lightbulb',
    count: tipsForScope(notebookStore.tips, scope.value, fit.value).length,
  },
  {
    value: 'runes',
    label: 'Runes',
    icon: 'gem',
    count: runePages.value.length,
    ...(hasBrokenRunePage.value && { warning: 'A rune page needs an update.' }),
  },
  {
    value: 'skills',
    label: 'Skill order',
    icon: 'list-ordered',
    count: skillOrdersForView(notebookStore.skillOrders, scope.value, fit.value).length,
  },
  { value: 'numbers', label: 'Numbers', icon: 'hash' },
])

function goHome(): void {
  void router.push({ name: 'Home' })
}

function navigate(next: MatchupScope): void {
  void router.push(matchupRoute('Matchup', { ...next, tab: tab.value, all: includeNarrower.value }))
}

/**
 * Jump to one enemy's matchup, keeping the lane and tab. Clicking the enemy
 * already selected clears it, back to the champ in general.
 */
function openMatchup(enemy: ChampId): void {
  const next = enemy === scope.value.enemy ? undefined : enemy
  void router.push(
    matchupRoute('Matchup', {
      myChamp: scope.value.myChamp,
      ...(next !== undefined && { enemy: next }),
      ...(scope.value.role !== undefined && { role: scope.value.role }),
      tab: tab.value,
      all: next === undefined ? includeNarrower.value : false,
    }),
  )
}

/** During champ select a click also marks that enemy as your lane opponent for the review. */
function pickChampSelectEnemy(enemy: ChampId): void {
  clientStore.chooseOpponent(enemy === scope.value.enemy ? undefined : enemy)
  openMatchup(enemy)
}

function openReviews(): void {
  void router.push(matchupRoute('Reviews', scope.value))
}

function startReview(): void {
  void router.push(matchupRoute('NewReview', scope.value))
}

function editRunePage(page: RunePage): void {
  void router.push({ name: 'RunePage', params: { id: page.id } })
}

function createRunePage(): void {
  void router.push(matchupRoute('NewRunePage', scope.value))
}

function editSkillOrder(order: SkillOrder): void {
  void router.push({ name: 'SkillOrder', params: { id: order.id } })
}

function createSkillOrder(): void {
  void router.push(matchupRoute('NewSkillOrder', scope.value))
}
</script>
