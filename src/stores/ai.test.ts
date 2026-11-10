import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AiConfig, AiGateway, AiRequest } from '@/data/ai'
import type { AiReviewContext } from '@/model/aiSuggestions'
import { MemorySettingsStore } from '@/persistence'
import { makeTip } from '@/test/fixtures'
import { useAiStore } from './ai'
import { useChampionStore } from './champions'
import { useSettingsStore } from './settings'

class FakeGateway implements AiGateway {
  keys = new Set<string>()
  answer = '{"changes":[]}'
  lastRequest?: AiRequest
  lastConfig?: AiConfig

  async complete(config: AiConfig, request: AiRequest): Promise<string> {
    this.lastConfig = config
    this.lastRequest = request
    return this.answer
  }
  async hasKey(provider: string): Promise<boolean> {
    return this.keys.has(provider)
  }
  async setKey(provider: string): Promise<void> {
    this.keys.add(provider)
  }
  async deleteKey(provider: string): Promise<void> {
    this.keys.delete(provider)
  }
}

const context: AiReviewContext = {
  scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
  reviewText: 'Q into Wind Wall all game.',
  tips: [makeTip()],
  patch: '26.20',
}

describe('useAiStore', () => {
  let gateway: FakeGateway

  beforeEach(async () => {
    setActivePinia(createPinia())
    useChampionStore().initialize()
    await useSettingsStore().initialize(new MemorySettingsStore())
    gateway = new FakeGateway()
    await useAiStore().initialize(gateway)
  })

  it('is off until Settings turns it on, and needs a key for Anthropic', async () => {
    const store = useAiStore()
    expect(store.isEnabled).toBe(false)
    expect(store.isReady).toBe(false)

    await useSettingsStore().setAi({ enabled: true })
    expect(store.isEnabled).toBe(true)
    expect(store.isReady).toBe(false)

    await store.saveKey('  sk-test  ')
    expect(store.hasKey).toBe(true)
    expect(store.isReady).toBe(true)

    await store.removeKey()
    expect(store.isReady).toBe(false)
  })

  it('is ready without a key for a local OpenAI-compatible server', async () => {
    const store = useAiStore()
    await useSettingsStore().setAi({ enabled: true, provider: 'openai_compatible' })
    expect(store.isReady).toBe(true)
  })

  it('builds the prompt, sends the config, and checks the answer', async () => {
    const store = useAiStore()
    gateway.answer = JSON.stringify({
      changes: [
        {
          kind: 'add',
          scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
          tipKind: 'watch_out',
          text: 'Throw Q after Wind Wall.',
          reason: 'From the review.',
        },
        { kind: 'remove', tipId: '99999999-9999-4999-8999-999999999999', reason: 'Unknown tip.' },
      ],
    })
    const result = await store.suggest(context)
    expect(result.changes).toHaveLength(1)
    expect(result.dropped).toBe(1)
    expect(gateway.lastConfig?.model).toBe('claude-opus-5-5')
    expect(gateway.lastRequest?.user).toContain('Q into Wind Wall')
    expect(store.isWorking).toBe(false)
  })

  it('turns a bad answer into a readable error', async () => {
    const store = useAiStore()
    gateway.answer = 'I cannot help with that.'
    await expect(store.suggest(context)).rejects.toThrow('held no JSON')
  })
})
