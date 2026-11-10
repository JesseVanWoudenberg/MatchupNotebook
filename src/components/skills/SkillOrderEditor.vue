<template>
  <form class="flex flex-col gap-6" @submit.prevent="submit">
    <div class="grid gap-3 sm:grid-cols-2">
      <BaseTextField
        v-model="name"
        label="Name"
        :placeholder="summary || 'Standard'"
        :error="nameError"
      />
      <BaseSelect v-model="scopeChoice" label="Applies to" :options="scopeOptions" />
    </div>
    <BaseToggle v-if="view.role" v-model="roleSpecific">
      Only in {{ ROLE_LABELS[view.role].toLowerCase() }} lane
    </BaseToggle>

    <section
      class="flex flex-col gap-4 rounded-lg border border-(--color-outline) bg-(--color-surface) p-4"
    >
      <SkillOrderGrid v-model="levels" />
      <p v-if="levelsError" class="text-xs text-(--color-danger)">{{ levelsError }}</p>

      <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-(--color-on-surface-muted)">Start</span>
          <BaseSelect
            v-for="index in 3"
            :key="index"
            v-model="start[index - 1]"
            :options="abilityOptions"
            placeholder="–"
            compact
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-(--color-on-surface-muted)">Max</span>
          <BaseSelect
            v-for="index in 3"
            :key="index"
            v-model="maxOrder[index - 1]"
            :options="basicOptions"
            placeholder="–"
            compact
          />
        </div>
        <BaseButton variant="outlined" size="sm" @click="fillStandard">Fill the rest</BaseButton>
        <span class="text-xs text-(--color-on-surface-muted)">
          Keeps what you set. R at 6, 11, 16.
        </span>
        <span class="flex-1" />
        <span v-if="summary" class="font-semibold">{{ summary }}</span>
      </div>
    </section>

    <div class="flex justify-end gap-2">
      <BaseButton variant="text" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton type="submit">{{ order ? 'Save' : 'Create skill order' }}</BaseButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { ABILITIES, MAX_LEVEL, type Ability, type MatchupScope, type SkillOrder } from '@/schema'
import {
  BaseButton,
  BaseSelect,
  BaseTextField,
  BaseToggle,
  type SelectOption,
} from '@/components/base'
import { useScopeChoice } from '@/composables/useScopeChoice'
import type { NewSkillOrderInput } from '@/model/factories'
import { ROLE_LABELS } from '@/model/labels'
import { fillStandardLevels, summarizeMaxOrder } from '@/model/skillOrders'
import { useChampionStore } from '@/stores/champions'
import SkillOrderGrid from './SkillOrderGrid.vue'

const props = defineProps<{
  view: MatchupScope
  /** Set when editing an existing skill order. */
  order?: SkillOrder
  defaultPatch: string
}>()

const emit = defineEmits<{
  save: [input: NewSkillOrderInput]
  cancel: []
}>()

const championStore = useChampionStore()
const {
  choice: scopeChoice,
  roleSpecific,
  options: scopeOptions,
  buildScope,
} = useScopeChoice(toRef(props, 'view'), props.order?.scope, championStore.nameOf)

const UNSET = ''

const name = ref(props.order?.name ?? '')
const nameError = ref<string>()
const levelsError = ref<string>()
/** The helper selects start empty on purpose; the grid is the truth. */
const start = ref<string[]>([UNSET, UNSET, UNSET])
const maxOrder = ref<string[]>([UNSET, UNSET, UNSET])
const levels = ref<(Ability | undefined)[]>(
  props.order ? [...props.order.levels] : Array.from({ length: MAX_LEVEL }, () => undefined),
)

const abilityOptions: SelectOption[] = ABILITIES.map((ability) => ({
  value: ability,
  label: ability,
}))
const basicOptions: SelectOption[] = abilityOptions.filter((option) => option.value !== 'R')

const summary = computed(() => {
  const set = levels.value.filter((ability): ability is Ability => ability !== undefined)
  return set.length === 0 ? '' : summarizeMaxOrder(set)
})

function chosen(values: string[]): Ability[] {
  return values.filter((value): value is Ability => value !== UNSET)
}

function fillStandard(): void {
  levels.value = fillStandardLevels(levels.value, chosen(start.value), chosen(maxOrder.value))
  levelsError.value = undefined
}

function submit(): void {
  const finalName = name.value.trim() || summary.value
  nameError.value = finalName === '' ? 'Give it a name.' : undefined
  const complete = levels.value.every((ability) => ability !== undefined)
  levelsError.value = complete ? undefined : 'Set an ability for every level, or use fill the rest.'
  if (nameError.value || levelsError.value) return

  emit('save', {
    scope: buildScope(),
    name: finalName,
    levels: levels.value.map((ability) => ability!),
    patch: props.order?.patch ?? props.defaultPatch,
  })
}
</script>
