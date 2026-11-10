<template>
  <form class="flex flex-col gap-6" @submit.prevent="submit">
    <div class="grid gap-3 sm:grid-cols-2">
      <BaseTextField
        v-model="name"
        label="Page name"
        placeholder="Taliyah default"
        :error="nameError"
      />
      <BaseSelect v-model="scopeChoice" label="Applies to" :options="scopeOptions" />
    </div>
    <BaseToggle v-if="view.role" v-model="roleSpecific">
      Only in {{ ROLE_LABELS[view.role].toLowerCase() }} lane
    </BaseToggle>

    <div class="flex flex-wrap justify-center gap-4">
      <!-- Primary tree -->
      <section :class="TREE_SECTION">
        <div class="flex justify-center gap-2" role="radiogroup" aria-label="Primary tree">
          <button
            v-for="style in runeStore.styles"
            :key="style.id"
            type="button"
            role="radio"
            :aria-checked="selection.primaryStyleId === style.id"
            :title="style.name"
            :class="[PICK, selection.primaryStyleId === style.id ? PICKED : UNPICKED]"
            @click="choosePrimary(style.id)"
          >
            <RuneIcon :id="style.id" kind="style" :size="32" />
          </button>
        </div>
        <p v-if="issueFor('primaryStyle')" :class="ISSUE">{{ issueFor('primaryStyle') }}</p>

        <template v-if="primary">
          <h2 :class="TREE_TITLE">{{ primary.name }}</h2>
          <div v-for="(row, rowIndex) in primary.slots" :key="rowIndex" class="flex flex-col gap-1">
            <div class="flex justify-center gap-3">
              <button
                v-for="perk in row"
                :key="perk.id"
                type="button"
                :title="perk.name"
                :class="[PICK, selection.selectedPerkIds[rowIndex] === perk.id ? PICKED : UNPICKED]"
                @click="choosePrimaryPerk(rowIndex, perk.id)"
              >
                <RuneIcon :id="perk.id" :size="rowIndex === 0 ? 48 : 40" />
              </button>
            </div>
            <p v-if="issueFor(rowIndex)" :class="ISSUE">{{ issueFor(rowIndex) }}</p>
          </div>
        </template>
        <p v-else :class="HINT">Pick a primary tree.</p>
      </section>

      <!-- Secondary tree -->
      <section :class="TREE_SECTION">
        <div class="flex justify-center gap-2" role="radiogroup" aria-label="Secondary tree">
          <button
            v-for="style in secondaryChoices"
            :key="style.id"
            type="button"
            role="radio"
            :aria-checked="selection.subStyleId === style.id"
            :title="style.name"
            :class="[PICK, selection.subStyleId === style.id ? PICKED : UNPICKED]"
            @click="chooseSecondary(style.id)"
          >
            <RuneIcon :id="style.id" kind="style" :size="32" />
          </button>
        </div>
        <p v-if="issueFor('subStyle')" :class="ISSUE">{{ issueFor('subStyle') }}</p>

        <template v-if="secondary">
          <h2 :class="TREE_TITLE">{{ secondary.name }}</h2>
          <div v-for="rowIndex in [1, 2, 3]" :key="rowIndex" class="flex justify-center gap-3">
            <button
              v-for="perk in secondary.slots[rowIndex]"
              :key="perk.id"
              type="button"
              :title="perk.name"
              :class="[PICK, isSecondaryPicked(perk.id) ? PICKED : UNPICKED]"
              @click="chooseSecondaryPerk(rowIndex, perk.id)"
            >
              <RuneIcon :id="perk.id" :size="40" />
            </button>
          </div>
          <p v-if="issueFor(4) || issueFor(5)" :class="ISSUE">{{ issueFor(4) ?? issueFor(5) }}</p>
        </template>
        <p v-else :class="HINT">Pick a secondary tree.</p>
      </section>

      <!-- Shards -->
      <section :class="TREE_SECTION">
        <h2 :class="TREE_TITLE">Shards</h2>
        <div v-for="(row, rowIndex) in SHARD_ROWS" :key="rowIndex" class="flex flex-col gap-1">
          <div class="flex justify-center gap-3">
            <button
              v-for="shard in row"
              :key="shard.id"
              type="button"
              :title="shard.name"
              :class="[
                PICK,
                selection.selectedPerkIds[SHARD_SLOTS[rowIndex]!] === shard.id ? PICKED : UNPICKED,
              ]"
              @click="chooseShard(rowIndex, shard.id)"
            >
              <RuneIcon :id="shard.id" :size="32" />
            </button>
          </div>
          <p v-if="issueFor(SHARD_SLOTS[rowIndex]!)" :class="ISSUE">
            {{ issueFor(SHARD_SLOTS[rowIndex]!) }}
          </p>
        </div>
      </section>
    </div>

    <div class="flex justify-end gap-2">
      <BaseButton variant="text" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton type="submit">{{ page ? 'Save page' : 'Create page' }}</BaseButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import type { RunePage, MatchupScope } from '@/schema'
import { BaseButton, BaseSelect, BaseTextField, BaseToggle } from '@/components/base'
import { useScopeChoice } from '@/composables/useScopeChoice'
import { SHARD_ROWS } from '@/data/runes'
import type { NewRunePageInput } from '@/model/factories'
import { ROLE_LABELS } from '@/model/labels'
import {
  SHARD_SLOTS,
  emptyRuneSelection,
  rowOfPerk,
  validateRuneSelection,
  type RuneIssue,
  type RuneIssueTarget,
  type RuneSelection,
} from '@/model/runeRules'
import { useChampionStore } from '@/stores/champions'
import { useRuneStore } from '@/stores/runes'
import RuneIcon from './RuneIcon.vue'

/**
 * Builds or edits one rune page, laid out like the client: each tree is a
 * column of centered rows, keystones larger than the rest. League's rules
 * come from validateRuneSelection; issues show after a save attempt, and at
 * once for a stored page the current data no longer accepts.
 */
const props = defineProps<{
  /** The matchup being viewed. Decides which scopes are offered. */
  view: MatchupScope
  /** Set when editing an existing page. */
  page?: RunePage
  defaultPatch: string
}>()

const emit = defineEmits<{
  save: [input: NewRunePageInput]
  cancel: []
}>()

const TREE_SECTION =
  'flex w-64 flex-col items-stretch gap-3 rounded-lg border border-(--color-outline) bg-(--color-surface) p-4'
const TREE_TITLE =
  'text-center text-xs font-semibold tracking-wide text-(--color-on-surface-muted) uppercase'
const PICK = 'rounded-full p-0.5 transition-opacity'
const PICKED = 'ring-2 ring-(--color-primary)'
const UNPICKED = 'opacity-45 hover:opacity-100'
const ISSUE = 'text-center text-xs text-(--color-danger)'
const HINT = 'py-6 text-center text-sm text-(--color-on-surface-muted)'

const championStore = useChampionStore()
const runeStore = useRuneStore()
const {
  choice: scopeChoice,
  roleSpecific,
  options: scopeOptions,
  buildScope,
} = useScopeChoice(toRef(props, 'view'), props.page?.scope, championStore.nameOf)

const name = ref(props.page?.name ?? '')
const nameError = ref<string>()

const selection = ref<RuneSelection>(
  props.page
    ? {
        primaryStyleId: props.page.primaryStyleId,
        subStyleId: props.page.subStyleId,
        selectedPerkIds: [...props.page.selectedPerkIds],
      }
    : emptyRuneSelection(),
)

const primary = computed(() => runeStore.style(selection.value.primaryStyleId))
const secondary = computed(() => runeStore.style(selection.value.subStyleId))
const secondaryChoices = computed(() =>
  runeStore.styles.filter((style) => style.id !== selection.value.primaryStyleId),
)

const hasTriedToSave = ref(false)
// A stored page that the data no longer accepts shows its problems at once.
const showIssues = computed(() => hasTriedToSave.value || props.page !== undefined)
const issues = computed<RuneIssue[]>(() =>
  showIssues.value ? validateRuneSelection(selection.value, runeStore.snapshot) : [],
)

function issueFor(target: RuneIssueTarget): string | undefined {
  return issues.value.find((issue) => issue.target === target)?.message
}

function choosePrimary(styleId: number): void {
  if (selection.value.primaryStyleId === styleId) return
  selection.value.primaryStyleId = styleId
  for (let slot = 0; slot < 4; slot++) selection.value.selectedPerkIds[slot] = undefined
  if (selection.value.subStyleId === styleId) chooseSecondary(undefined)
}

function choosePrimaryPerk(row: number, perkId: number): void {
  selection.value.selectedPerkIds[row] = perkId
}

function chooseSecondary(styleId: number | undefined): void {
  if (selection.value.subStyleId === styleId) return
  selection.value.subStyleId = styleId
  selection.value.selectedPerkIds[4] = undefined
  selection.value.selectedPerkIds[5] = undefined
}

function isSecondaryPicked(perkId: number): boolean {
  return (
    selection.value.selectedPerkIds[4] === perkId || selection.value.selectedPerkIds[5] === perkId
  )
}

/**
 * Two secondary runes from two different rows. Clicking in a row that already
 * has a pick replaces that pick; otherwise the older pick makes room.
 */
function chooseSecondaryPerk(row: number, perkId: number): void {
  const style = secondary.value
  if (!style) return
  const picks = [selection.value.selectedPerkIds[4], selection.value.selectedPerkIds[5]]
  const sameRowIndex = picks.findIndex(
    (pick) => pick !== undefined && rowOfPerk(style, pick) === row,
  )
  if (sameRowIndex >= 0) picks[sameRowIndex] = perkId
  else if (picks[0] === undefined) picks[0] = perkId
  else if (picks[1] === undefined) picks[1] = perkId
  else {
    picks[0] = picks[1]
    picks[1] = perkId
  }
  // Keep them in row order so the page reads top to bottom.
  picks.sort((a, b) => (rowOfPerk(style, a ?? 0) ?? 9) - (rowOfPerk(style, b ?? 0) ?? 9))
  selection.value.selectedPerkIds[4] = picks[0]
  selection.value.selectedPerkIds[5] = picks[1]
}

function chooseShard(rowIndex: number, shardId: number): void {
  selection.value.selectedPerkIds[SHARD_SLOTS[rowIndex]!] = shardId
}

function submit(): void {
  hasTriedToSave.value = true
  nameError.value = name.value.trim() === '' ? 'Give the page a name.' : undefined
  const problems = validateRuneSelection(selection.value, runeStore.snapshot)
  if (nameError.value || problems.length > 0) return

  emit('save', {
    scope: buildScope(),
    name: name.value,
    primaryStyleId: selection.value.primaryStyleId!,
    subStyleId: selection.value.subStyleId!,
    selectedPerkIds: selection.value.selectedPerkIds.map((id) => id!),
    patch: props.page?.patch ?? props.defaultPatch,
  })
}
</script>
