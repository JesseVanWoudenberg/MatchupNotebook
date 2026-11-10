<template>
  <BaseDialog v-model:open="open" title="Share tips">
    <div class="flex flex-col gap-4">
      <BaseSelect v-model="mode" label="What to share" :options="MODES" />

      <template v-if="mode === 'champ'">
        <div class="grid gap-3 sm:grid-cols-2">
          <BaseSelect v-model="myChamp" label="Your champ" :options="championOptions" />
          <BaseSelect v-model="enemy" label="Enemy" :options="enemyOptions" />
        </div>
        <div class="flex flex-col gap-1 text-sm">
          <span class="text-(--color-on-surface-muted)">Lane</span>
          <LaneSelector v-model="role" />
        </div>
      </template>

      <div class="flex flex-wrap gap-4">
        <BaseToggle v-model="includeRunePages">Rune pages</BaseToggle>
        <BaseToggle v-model="includeSkillOrders">Skill orders</BaseToggle>
      </div>

      <p class="rounded-md bg-(--color-surface-raised) px-3 py-2 text-(--color-on-surface)">
        {{ summary }}
      </p>

      <BaseTextField
        v-model="authorName"
        label="Your name on these tips"
        placeholder="How others will see who wrote them"
      />
      <p>Reviews stay private and are never shared.</p>
    </div>
    <template #actions>
      <BaseButton variant="text" @click="open = false">Cancel</BaseButton>
      <BaseButton :disabled="isSaving || isEmpty" @click="share">
        <BaseIcon name="download" :size="15" />
        Save file
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ChampId, MatchupScope, Role } from '@/schema'
import {
  BaseButton,
  BaseDialog,
  BaseIcon,
  BaseSelect,
  BaseTextField,
  BaseToggle,
} from '@/components/base'
import type { SelectOption } from '@/components/base'
import LaneSelector from '@/components/matchups/LaneSelector.vue'
import { useToast } from '@/composables/useToast'
import type { ScopeFilter } from '@/model/matchup'
import { shareDocument, shareFileName, type ShareOptions } from '@/model/sharing'
import { serializeNotebook } from '@/persistence'
import { useChampionStore } from '@/stores/champions'
import { useNotebookStore } from '@/stores/notebook'
import { saveTextAs } from '@/tauri/sharingFiles'

/**
 * Share export. Opens on the matchup you are looking at, but every part of
 * the slice can be changed here: your champ, one enemy or any, one lane or
 * any, or simply everything. The file is the storage format without reviews.
 */
const props = defineProps<{ scope: MatchupScope }>()

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const championStore = useChampionStore()
const notebookStore = useNotebookStore()

type Mode = 'champ' | 'everything'
const MODES: SelectOption[] = [
  { value: 'champ', label: 'One champion' },
  { value: 'everything', label: 'Every tip in the notebook' },
]
const ANY_ENEMY = ''

const mode = ref<Mode>('champ')
const myChamp = ref<ChampId>(props.scope.myChamp)
const enemy = ref<string>(ANY_ENEMY)
const role = ref<Role>()
const includeRunePages = ref(true)
const includeSkillOrders = ref(true)
const authorName = ref('')
const isSaving = ref(false)

const championOptions = computed<SelectOption[]>(() =>
  championStore.search('').map((champion) => ({ value: champion.id, label: champion.name })),
)
const enemyOptions = computed<SelectOption[]>(() => [
  { value: ANY_ENEMY, label: 'Any enemy' },
  ...championOptions.value.filter((option) => option.value !== myChamp.value),
])

const view = computed<ScopeFilter | undefined>(() => {
  if (mode.value === 'everything') return undefined
  return {
    myChamp: myChamp.value,
    ...(enemy.value !== ANY_ENEMY && { enemy: enemy.value }),
    ...(role.value !== undefined && { role: role.value }),
  }
})

const options = computed<ShareOptions>(() => ({
  ...(view.value && { view: view.value }),
  includeRunePages: includeRunePages.value,
  includeSkillOrders: includeSkillOrders.value,
}))

/** What the file would hold right now, so the choice is visible before saving. */
const preview = computed(() =>
  notebookStore.notebook ? shareDocument(notebookStore.notebook, options.value) : undefined,
)

const isEmpty = computed(() => {
  const document = preview.value
  if (!document) return true
  return document.tips.length + document.runePages.length + document.skillOrders.length === 0
})

const summary = computed(() => {
  const document = preview.value
  if (!document) return ''
  const parts = [
    count(document.tips.length, 'tip', 'tips'),
    ...(includeRunePages.value
      ? [count(document.runePages.length, 'rune page', 'rune pages')]
      : []),
    ...(includeSkillOrders.value
      ? [count(document.skillOrders.length, 'skill order', 'skill orders')]
      : []),
  ]
  return isEmpty.value ? 'Nothing matches this choice yet.' : `This file: ${parts.join(', ')}.`
})

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

watch(open, (isOpen) => {
  if (!isOpen) return
  mode.value = 'champ'
  myChamp.value = props.scope.myChamp
  enemy.value = props.scope.enemy ?? ANY_ENEMY
  role.value = props.scope.role
  authorName.value = notebookStore.profile?.authorName ?? ''
})

// A champ cannot be its own enemy.
watch(myChamp, (next) => {
  if (enemy.value === next) enemy.value = ANY_ENEMY
})

async function share(): Promise<void> {
  const notebook = notebookStore.notebook
  if (!notebook) return
  isSaving.value = true
  try {
    const name = authorName.value.trim()
    if (name !== notebook.profile.authorName) await notebookStore.setAuthorName(name)
    const document = shareDocument(notebook, options.value)
    const path = await saveTextAs(
      shareFileName(view.value, championStore.nameOf),
      serializeNotebook(document),
    )
    if (!path) return
    open.value = false
    toast.show(`Saved ${count(document.tips.length, 'tip', 'tips')}.`)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Could not save the file.')
  } finally {
    isSaving.value = false
  }
}
</script>
