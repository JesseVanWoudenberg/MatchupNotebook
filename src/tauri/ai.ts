import { invoke } from '@tauri-apps/api/core'
import { NoAiGateway, type AiConfig, type AiGateway, type AiRequest } from '@/data/ai'
import type { AiProvider } from '@/schema/settings'
import { isTauri } from './environment'

/** Tauri rejects with the Rust side's plain string; callers expect an Error. */
async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch (reason: unknown) {
    throw reason instanceof Error ? reason : new Error(String(reason))
  }
}

/**
 * The Rust side makes the call and keeps the key in Windows Credential
 * Manager. The key is typed once in Settings and never read back here.
 */
class TauriAiGateway implements AiGateway {
  complete(config: AiConfig, request: AiRequest): Promise<string> {
    return call<string>('ai_complete', {
      request: {
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
        system: request.system,
        user: request.user,
      },
    })
  }

  hasKey(provider: AiProvider): Promise<boolean> {
    return call<boolean>('ai_key_exists', { provider })
  }

  setKey(provider: AiProvider, key: string): Promise<void> {
    return call<void>('ai_key_set', { provider, key })
  }

  deleteKey(provider: AiProvider): Promise<void> {
    return call<void>('ai_key_delete', { provider })
  }
}

export function createAiGateway(): AiGateway {
  return isTauri() ? new TauriAiGateway() : new NoAiGateway()
}
