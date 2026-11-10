<template>
  <BaseDialog v-model:open="open" title="Suggested changes" size="lg">
    <div class="flex flex-col gap-3">
      <p v-if="aiStore.isWorking" class="flex items-center gap-2">
        <BaseIcon name="sparkles" :size="16" />
        Reading your review…
      </p>

      <p v-else-if="error" class="selectable text-(--color-danger)">{{ error }}</p>

      <p v-else-if="decisions.length === 0">
        Nothing to change. The review adds nothing your tips do not already say.
      </p>

      <template v-else>
        <p>Tick what to keep and edit the text if you like. Nothing changes until you apply.</p>
        <ul class="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
          <li
            v-for="(decision, index) in decisions"
            :key="index"
            class="flex gap-3 rounded-lg border border-(--color-outline) bg-(--color-surface) p-3"
            :class="{ 'opacity-60': !decision.accepted }"
          >
            <BaseToggle
              v-model="decision.accepted"
              class="mt-1"
              :aria-label="AI_CHANGE_LABELS[decision.change.kind]"
            />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <BaseBadge :tone="TONES[decision.change.kind]">
                  {{ AI_CHANGE_LABELS[decision.change.kind] }}
                </BaseBadge>
                <span
                  v-if="decision.change.kind === 'add'"
                  class="text-xs text-(--color-on-surface-muted)"
                >
                  {{ KIND_LABELS[decision.change.tipKind] }} ·
                  {{ describeScope(decision.change.scope, championStore.nameOf) }}
                </span>
              </div>
              <p
                v-if="decision.change.kind !== 'add'"
                class="text-sm text-(--color-on-surface-muted)"
                :class="{ 'line-through': decision.change.kind === 'remove' }"
              >
                {{ tipText(decision.change.tipId) }}
              </p>
              <BaseTextArea
                v-if="decision.change.kind !== 'remove'"
                v-model="decision.text"
                :rows="2"
              />
              <p class="text-xs text-(--color-on-surface-muted)">{{ decision.change.reason }}</p>
            </div>
          </li>
        </ul>
        <p v-if="dropped > 0" class="text-xs text-(--color-on-surface-muted)">
          {{ dropped }} {{ dropped === 1 ? 'suggestion' : 'suggestions' }} about tips outside this
          matchup left out.
        </p>
      </template>
    </div>
    <template #actions>
      <BaseButton variant="text" @click="open = false">
        {{ acceptedCount > 0 ? 'Cancel' : 'Close' }}
      </BaseButton>
      <BaseButton v-if="error" variant="outlined" @click="run">Try again</BaseButton>
      <BaseButton v-if="acceptedCount > 0" :disabled="isApplying" @click="apply">
        {{
          isApplying
            ? 'Applying…'
            : `Apply ${acceptedCount} ${acceptedCount === 1 ? 'change' : 'changes'}`
        }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Uuid } from '@/schema'
import {
  BaseBadge,
  BaseButton,
  BaseDialog,
  BaseIcon,
  BaseTextArea,
  BaseToggle,
} from '@/components/base'
import { useToast } from '@/composables/useToast'
import {
  AI_CHANGE_LABELS,
  decisionsFor,
  type AiChange,
  type AiDecision,
  type AiReviewContext,
} from '@/model/aiSuggestions'
import { KIND_LABELS, describeScope } from '@/model/labels'
import { useAiStore } from '@/stores/ai'
import { useChampionStore } from '@/stores/champions'
import { useNotebookStore } from '@/stores/notebook'

/**
 * The review screen for AI proposals. Every line is approved, edited or
 * denied here; only "apply" touches the notebook, through the same store
 * actions a hand-written change uses (D-044).
 */
const props = defineProps<{
  context: AiReviewContext
  /** Added tips link to this review, like tips written by hand on the page. */
  reviewId: Uuid
}>()

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const aiStore = useAiStore()
const championStore = useChampionStore()
const notebookStore = useNotebookStore()

const TONES: Readonly<Record<AiChange['kind'], 'primary' | 'neutral' | 'danger'>> = {
  add: 'primary',
  update: 'neutral',
  remove: 'danger',
}

const decisions = ref<AiDecision[]>([])
const dropped = ref(0)
const error = ref<string>()
const isApplying = ref(false)

const acceptedCount = computed(() => decisions.value.filter(isApplicable).length)

function isApplicable(decision: AiDecision): boolean {
  if (!decision.accepted) return false
  return decision.change.kind === 'remove' || decision.text.trim() !== ''
}

function tipText(tipId: Uuid): string {
  return props.context.tips.find((tip) => tip.id === tipId)?.text ?? ''
}

watch(open, (isOpen) => {
  if (isOpen) void run()
})

async function run(): Promise<void> {
  decisions.value = []
  dropped.value = 0
  error.value = undefined
  try {
    const result = await aiStore.suggest(props.context)
    decisions.value = decisionsFor(result.changes)
    dropped.value = result.dropped
  } catch (reason: unknown) {
    error.value = reason instanceof Error ? reason.message : 'The AI could not be reached.'
  }
}

async function apply(): Promise<void> {
  isApplying.value = true
  let applied = 0
  try {
    for (const decision of decisions.value.filter(isApplicable)) {
      const change = decision.change
      if (change.kind === 'add') {
        await notebookStore.addTip({
          scope: change.scope,
          kind: change.tipKind,
          text: decision.text,
          patch: props.context.patch,
          reviewId: props.reviewId,
        })
      } else if (change.kind === 'update') {
        await notebookStore.updateTip(change.tipId, { text: decision.text })
      } else {
        await notebookStore.removeTip(change.tipId)
      }
      applied++
    }
    open.value = false
    toast.show(`Applied ${applied} ${applied === 1 ? 'change' : 'changes'}.`)
  } catch (reason: unknown) {
    toast.error(reason instanceof Error ? reason.message : 'Could not apply the changes.')
  } finally {
    isApplying.value = false
  }
}
</script>
