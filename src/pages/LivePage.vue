<template>
  <PageShell :title="title" :subtitle="phaseLabel">
    <template #actions>
      <BaseButton variant="outlined" @click="openNotebook">
        Open notebook
        <BaseIcon name="arrow-right" :size="14" />
      </BaseButton>
    </template>

    <ClientEnemyButtons
      label="Enemies"
      :enemies="enemies"
      :current="scope?.enemy"
      empty-text="Enemies show up here as they lock in."
      @select="pickOpponent"
    />

    <template v-if="scope">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <section class="flex flex-col gap-2">
          <AbilityPanel v-if="scope.enemy" :champ="scope.enemy" :my-champ="scope.myChamp" />
          <p v-else class="text-sm text-(--color-on-surface-muted)">
            Click your lane opponent above to see their numbers.
          </p>
        </section>
        <section class="flex flex-col gap-3">
          <BaseTabs v-model="tab" :tabs="tabs" />
          <MatchupTips v-if="tab === 'tips'" :view="scope" @open-matchup="pickOpponent" />
          <MatchupRunes
            v-else-if="tab === 'runes'"
            :view="scope"
            @edit="editRunePage"
            @create="createRunePage"
            @open-matchup="pickOpponent"
          />
          <MatchupSkillOrders
            v-else
            :view="scope"
            @edit="editSkillOrder"
            @create="createSkillOrder"
            @open-matchup="pickOpponent"
          />
        </section>
      </div>
    </template>
    <p v-else class="text-sm text-(--color-on-surface-muted)">{{ emptyText }}</p>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ChampId, MatchupScope, RunePage, SkillOrder } from '@/schema'
import { BaseButton, BaseIcon, BaseTabs, type TabOption } from '@/components/base'
import { PageShell } from '@/components/composite'
import AbilityPanel from '@/components/abilities/AbilityPanel.vue'
import ClientEnemyButtons from '@/components/client/ClientEnemyButtons.vue'
import MatchupTips from '@/components/matchups/MatchupTips.vue'
import MatchupRunes from '@/components/runes/MatchupRunes.vue'
import MatchupSkillOrders from '@/components/skills/MatchupSkillOrders.vue'
import { describeScope } from '@/model/labels'
import { tipsForScope } from '@/model/matchup'
import { runePagesForView } from '@/model/runePages'
import { skillOrdersForView } from '@/model/skillOrders'
import { matchupRoute } from '@/router/matchupRoute'
import { useChampionStore } from '@/stores/champions'
import { useClientStore } from '@/stores/client'
import { useNotebookStore } from '@/stores/notebook'

/**
 * The focused page for champ select and the game: your lane opponent's
 * numbers and your own notes, nothing else. It follows the client on its
 * own; the enemy strip is the one choice you make here.
 */
const router = useRouter()
const championStore = useChampionStore()
const clientStore = useClientStore()
const notebookStore = useNotebookStore()

type LiveTab = 'tips' | 'runes' | 'skills'
const tab = ref<LiveTab>('tips')

/** Champ select while it lasts, then the frozen game. */
const myChamp = computed(() => clientStore.champSelect?.myChamp ?? clientStore.lastGame?.myChamp)
const role = computed(() => clientStore.champSelect?.role ?? clientStore.lastGame?.role)
const enemies = computed<readonly ChampId[]>(
  () => clientStore.champSelect?.enemies ?? clientStore.lastGame?.enemies ?? [],
)

const scope = computed<MatchupScope | undefined>(() => {
  if (!myChamp.value || !clientStore.isLive) return undefined
  const enemy = clientStore.opponent
  return {
    myChamp: myChamp.value,
    ...(enemy !== undefined && enemies.value.includes(enemy) && { enemy }),
    ...(role.value !== undefined && { role: role.value }),
  }
})

const title = computed(() =>
  scope.value ? describeScope(scope.value, championStore.nameOf) : 'Live',
)
const phaseLabel = computed(() => {
  if (clientStore.isInChampSelect) return 'Champ select'
  return clientStore.isLive ? 'In game' : 'Not in a game'
})
const emptyText = computed(() =>
  clientStore.isLive
    ? 'Waiting for your pick.'
    : 'Nothing is running. This page fills in during champ select and the game.',
)

const tabs = computed<TabOption[]>(() => {
  const view = scope.value
  if (!view) return []
  return [
    {
      value: 'tips',
      label: 'Tips',
      icon: 'lightbulb',
      count: tipsForScope(notebookStore.tips, view).length,
    },
    {
      value: 'runes',
      label: 'Runes',
      icon: 'gem',
      count: runePagesForView(notebookStore.runePages, view).length,
    },
    {
      value: 'skills',
      label: 'Skill order',
      icon: 'list-ordered',
      count: skillOrdersForView(notebookStore.skillOrders, view).length,
    },
  ]
})

/** Clicking the enemy already chosen clears the choice. */
function pickOpponent(enemy: ChampId): void {
  clientStore.chooseOpponent(enemy === scope.value?.enemy ? undefined : enemy)
}

function openNotebook(): void {
  void router.push(scope.value ? matchupRoute('Matchup', scope.value) : { name: 'Home' })
}

function editRunePage(page: RunePage): void {
  void router.push({ name: 'RunePage', params: { id: page.id } })
}

function createRunePage(): void {
  if (scope.value) void router.push(matchupRoute('NewRunePage', scope.value))
}

function editSkillOrder(order: SkillOrder): void {
  void router.push({ name: 'SkillOrder', params: { id: order.id } })
}

function createSkillOrder(): void {
  if (scope.value) void router.push(matchupRoute('NewSkillOrder', scope.value))
}
</script>
