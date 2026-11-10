import { z } from 'zod'

/**
 * App settings. A separate small file next to the default notebook location,
 * never inside the notebook, because it says where the notebook is.
 */
export const SETTINGS_SCHEMA_VERSION = 1

export const Theme = z.enum(['system', 'light', 'dark'])
export type Theme = z.infer<typeof Theme>
export const THEMES = Theme.options

/** Tauri's shortcut syntax. CommandOrControl keeps it right on a Mac. */
export const DEFAULT_CHAMP_SELECT_HOTKEY = 'CommandOrControl+Shift+M'

export const AiProvider = z.enum(['anthropic', 'openai_compatible'])
export type AiProvider = z.infer<typeof AiProvider>
export const AI_PROVIDERS = AiProvider.options

export const AiSettings = z.strictObject({
  enabled: z.boolean().default(false),
  provider: AiProvider.default('anthropic'),
  model: z.string().default('claude-opus-5-5'),
  /** Only for OpenAI-compatible servers, like http://localhost:11434/v1. */
  baseUrl: z.string().default(''),
})
export type AiSettings = z.infer<typeof AiSettings>

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: 'anthropic',
  model: 'claude-opus-5-5',
  baseUrl: '',
}

export const Settings = z.strictObject({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  theme: Theme,
  /** Folder holding notebook.json. Absent means the default Roaming app folder. */
  notebookDirectory: z.string().min(1).optional(),
  /** Offer a review in a small popup when a game ends. */
  postGamePopup: z.boolean().default(true),
  /** Switch to the focused live view in champ select and in game. */
  liveView: z.boolean().default(true),
  /** Print each tip's patch on its card. Off: the list stays clean. */
  showTipPatch: z.boolean().default(false),
  /** Brings the window up during champ select. Off everywhere else. */
  champSelectHotkey: z.string().min(1).default(DEFAULT_CHAMP_SELECT_HOTKEY),
  /** The AI add-on. Off until turned on (D-044). The key lives in Credential Manager, never here. */
  ai: AiSettings.default(DEFAULT_AI_SETTINGS),
})
export type Settings = z.infer<typeof Settings>

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  theme: 'system',
  postGamePopup: true,
  liveView: true,
  showTipPatch: false,
  champSelectHotkey: DEFAULT_CHAMP_SELECT_HOTKEY,
  ai: DEFAULT_AI_SETTINGS,
}
