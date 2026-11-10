import type { AiProvider } from '@/schema/settings'

/**
 * The AI add-on's boundary. Optional, off by default (D-044). The frontend
 * builds the prompt and reads the answer; the Rust side holds the key and
 * makes the call, so the key never enters the webview.
 */

/**
 * The one switch for the whole add-on. Not ready for testers yet, so it only
 * exists in `tauri dev`; a release build shows no setting and no button, even
 * when settings.json says it is on (D-053). Set to `true` to ship it.
 */
export const AI_ADD_ON_AVAILABLE: boolean = import.meta.env.DEV

export const AI_PROVIDER_LABELS: Readonly<Record<AiProvider, string>> = {
  anthropic: 'Anthropic (Claude)',
  openai_compatible: 'OpenAI-compatible (Ollama, LM Studio, others)',
}

export interface AiConfig {
  provider: AiProvider
  model: string
  /** Only for OpenAI-compatible servers, like http://localhost:11434/v1. */
  baseUrl: string
}

export interface AiRequest {
  system: string
  user: string
  /** JSON Schema the answer must match, for providers that can enforce it. */
  jsonSchema: Record<string, unknown>
}

export interface AiGateway {
  /** The provider's answer as text. Rejects with a message the user can read. */
  complete(config: AiConfig, request: AiRequest): Promise<string>
  hasKey(provider: AiProvider): Promise<boolean>
  setKey(provider: AiProvider, key: string): Promise<void>
  deleteKey(provider: AiProvider): Promise<void>
}

const DESKTOP_ONLY = 'The AI add-on only works in the desktop app.'

export class NoAiGateway implements AiGateway {
  async complete(): Promise<string> {
    throw new Error(DESKTOP_ONLY)
  }
  async hasKey(): Promise<boolean> {
    return false
  }
  async setKey(): Promise<void> {
    throw new Error(DESKTOP_ONLY)
  }
  async deleteKey(): Promise<void> {}
}
