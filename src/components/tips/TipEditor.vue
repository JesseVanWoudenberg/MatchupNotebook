<template>
  <form
    class="flex flex-col gap-3 rounded-lg border border-(--color-primary) bg-(--color-surface) p-4"
    @submit.prevent="submit"
  >
    <BaseTextArea
      v-model="text"
      label="Tip"
      placeholder="What do you want to remember about this matchup?"
      :rows="3"
      autofocus
      :error="textError"
    />

    <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
      <BaseSelect v-model="scopeChoice" label="Applies to" :options="scopeOptions" />
      <div class="flex flex-col gap-1 text-sm">
        <span class="text-(--color-on-surface-muted)">Kind</span>
        <div class="flex items-center gap-2">
          <div
            class="flex overflow-hidden rounded-md border border-(--color-outline)"
            role="radiogroup"
            aria-label="Kind"
          >
            <button
              v-for="option in TIP_KINDS"
              :key="option"
              type="button"
              role="radio"
              :aria-checked="kind === option"
              :aria-label="KIND_LABELS[option]"
              :title="KIND_LABELS[option]"
              class="flex h-9 min-w-9 items-center justify-center px-2 transition-colors"
              :class="
                kind === option
                  ? 'bg-(--color-primary-soft) text-(--color-primary)'
                  : 'text-(--color-on-surface-muted) hover:bg-(--color-surface-raised) hover:text-(--color-on-surface)'
              "
              @click="kind = option"
            >
              <BaseIcon v-if="KIND_ICONS[option]" :name="KIND_ICONS[option]!" :size="16" />
              <span v-else class="text-xs">{{ KIND_LABELS[option] }}</span>
            </button>
          </div>
          <span class="text-(--color-on-surface-muted)">{{ KIND_LABELS[kind] }}</span>
        </div>
      </div>
    </div>

    <BaseToggle v-if="view.role" v-model="roleSpecific">
      Only in {{ ROLE_LABELS[view.role].toLowerCase() }} lane
    </BaseToggle>

    <div class="flex items-center gap-2">
      <span
        class="text-xs text-(--color-on-surface-muted)"
        title="Tips are filed under the current patch"
      >
        Patch {{ patch }}
      </span>
      <div class="ml-auto flex gap-2">
        <BaseButton variant="text" @click="emit('cancel')">Cancel</BaseButton>
        <BaseButton type="submit">{{ tip ? 'Save' : 'Add tip' }}</BaseButton>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { TIP_KINDS, type Tip, type TipKind, type TipScope } from '@/schema'
import {
  BaseButton,
  BaseIcon,
  BaseSelect,
  BaseTextArea,
  BaseToggle,
  type SelectOption,
} from '@/components/base'
import type { NewTipInput } from '@/model/factories'
import type { ScopeFilter } from '@/model/matchup'
import { KIND_LABELS, ROLE_LABELS, describeScope } from '@/model/labels'
import { useChampionStore } from '@/stores/champions'
import { KIND_ICONS } from './tipKindIcons'

/**
 * Add or edit one tip. The patch is never typed: a new tip gets the current
 * patch and an edited tip keeps its own, since a tip that still applies is
 * best left as it was written and a wrong one is best deleted.
 */
const props = defineProps<{
  /** The matchup being viewed. Decides which scopes are offered. */
  view: ScopeFilter
  /** Set when editing an existing tip. */
  tip?: Tip
  /** The current patch, filed on a new tip. */
  defaultPatch: string
}>()

const emit = defineEmits<{
  save: [input: NewTipInput]
  cancel: []
}>()

const championStore = useChampionStore()

type ScopeChoice = 'matchup' | 'myChamp' | 'enemy' | 'current'

/** The champ part of each offered scope. Role is added separately. */
const scopeBases = computed(() => {
  const bases: Partial<Record<ScopeChoice, TipScope>> = {}
  const { myChamp, enemy } = props.view
  if (myChamp !== undefined && enemy !== undefined) bases.matchup = { myChamp, enemy }
  if (myChamp !== undefined) bases.myChamp = { myChamp }
  if (enemy !== undefined) bases.enemy = { enemy }
  if (props.tip && !matchesAnOfferedBase(props.tip.scope, bases)) bases.current = props.tip.scope
  return bases
})

function withoutRole(scope: TipScope): TipScope {
  const { myChamp, enemy } = scope
  return { ...(myChamp !== undefined && { myChamp }), ...(enemy !== undefined && { enemy }) }
}

function sameChamps(a: TipScope, b: TipScope): boolean {
  return a.myChamp === b.myChamp && a.enemy === b.enemy
}

function matchesAnOfferedBase(scope: TipScope, bases: Partial<Record<ScopeChoice, TipScope>>) {
  return Object.values(bases).some((base) => base && sameChamps(base, scope))
}

function initialScopeChoice(): ScopeChoice {
  const bases = scopeBases.value
  if (props.tip) {
    const match = (Object.keys(bases) as ScopeChoice[]).find((key) =>
      sameChamps(bases[key]!, props.tip!.scope),
    )
    if (match) return match
  }
  if (bases.matchup) return 'matchup'
  if (bases.myChamp) return 'myChamp'
  return 'enemy'
}

const scopeOptions = computed<SelectOption[]>(() =>
  (Object.entries(scopeBases.value) as [ScopeChoice, TipScope][]).map(([value, base]) => ({
    value,
    label: describeScope(withoutRole(base), championStore.nameOf),
  })),
)

const text = ref(props.tip?.text ?? '')
const kind = ref<TipKind>(props.tip?.kind ?? 'general')
const patch = computed(() => props.tip?.patch ?? props.defaultPatch)
const scopeChoice = ref<ScopeChoice>(initialScopeChoice())
const roleSpecific = ref(props.tip ? props.tip.scope.role !== undefined : false)

const textError = ref<string>()

function buildScope(): TipScope {
  const base = scopeBases.value[scopeChoice.value] ?? scopeBases.value.myChamp!
  const role = roleSpecific.value ? props.view.role : undefined
  return { ...withoutRole(base), ...(role !== undefined && { role }) }
}

function submit(): void {
  textError.value = text.value.trim() === '' ? 'Write something first.' : undefined
  if (textError.value) return

  emit('save', {
    scope: buildScope(),
    kind: kind.value,
    text: text.value,
    patch: patch.value,
  })
}
</script>
