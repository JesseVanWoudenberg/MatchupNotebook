import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { AI_ADD_ON_AVAILABLE, type AiConfig, type AiGateway } from '@/data/ai'
import {
  AI_CHANGE_SET_JSON_SCHEMA,
  buildAiPrompt,
  checkAiChanges,
  parseAiAnswer,
  type AiChange,
  type AiReviewContext,
} from '@/model/aiSuggestions'
import { useChampionStore } from './champions'
import { useSettingsStore } from './settings'

export interface AiSuggestions {
  changes: AiChange[]
  /** Changes the AI proposed for tips outside the review's scope, left out. */
  dropped: number
}

/**
 * The AI add-on. Off by default; nothing here runs until Settings turns it
 * on. Proposals come back as a list for the review screen and never touch
 * the notebook on their own (D-044).
 */
export const useAiStore = defineStore('ai', () => {
  const settingsStore = useSettingsStore()
  const championStore = useChampionStore()
  const hasKey = ref(false)
  const isWorking = ref(false)
  let gateway: AiGateway | undefined

  const isEnabled = computed(() => AI_ADD_ON_AVAILABLE && settingsStore.ai.enabled)
  const config = computed<AiConfig>(() => ({
    provider: settingsStore.ai.provider,
    model: settingsStore.ai.model,
    baseUrl: settingsStore.ai.baseUrl,
  }))
  /** Ready to be asked: on, and with a key where the provider needs one. */
  const isReady = computed(
    () => isEnabled.value && (hasKey.value || settingsStore.ai.provider === 'openai_compatible'),
  )

  async function initialize(source: AiGateway): Promise<void> {
    gateway = source
    await refreshKey()
  }

  function requireGateway(): AiGateway {
    if (!gateway) throw new Error('The AI add-on is not set up yet.')
    return gateway
  }

  async function refreshKey(): Promise<void> {
    try {
      hasKey.value = gateway ? await gateway.hasKey(settingsStore.ai.provider) : false
    } catch (error: unknown) {
      console.warn('Could not read the key store', error)
      hasKey.value = false
    }
  }

  watch(() => settingsStore.ai.provider, refreshKey)

  async function saveKey(key: string): Promise<void> {
    await requireGateway().setKey(settingsStore.ai.provider, key.trim())
    hasKey.value = true
  }

  async function removeKey(): Promise<void> {
    await requireGateway().deleteKey(settingsStore.ai.provider)
    hasKey.value = false
  }

  /** The prompt, the call, the parse. Rejects with a message the user can read. */
  async function suggest(context: AiReviewContext): Promise<AiSuggestions> {
    const prompt = buildAiPrompt(context, championStore.nameOf)
    isWorking.value = true
    try {
      const text = await requireGateway().complete(config.value, {
        system: prompt.system,
        user: prompt.user,
        jsonSchema: AI_CHANGE_SET_JSON_SCHEMA,
      })
      const parsed = parseAiAnswer(text)
      if (!parsed.ok) throw new Error(parsed.error)
      return checkAiChanges(parsed.set, context)
    } finally {
      isWorking.value = false
    }
  }

  return {
    hasKey,
    isWorking,
    isEnabled,
    isReady,
    config,
    initialize,
    refreshKey,
    saveKey,
    removeKey,
    suggest,
  }
})
