import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { z } from 'zod'
import {
  GameSummary,
  NoLeagueClientLink,
  SEND_OUTCOMES,
  type ClientStatus,
  type GameSummary as Game,
  type LeagueClientLink,
  type RunePageToSend,
  type SendOutcome,
  type Unlisten,
} from '@/data/leagueClient'
import { isTauri } from './environment'

// Event and command names shared with src-tauri/src/league_client/mod.rs.
const STATUS_EVENT = 'league-client:status'
const PHASE_EVENT = 'league-client:phase'
const CHAMP_SELECT_EVENT = 'league-client:champ-select'
const HOTKEY_EVENT = 'league-client:hotkey'
/** From the popup window to the main one. */
const WRITE_REVIEW_EVENT = 'post-game:write-review'
const POPUP_ROUTE_HASH = '#/post-game'

const ClientStatusPayload = z.looseObject({ connected: z.boolean(), phase: z.string() })
const SendOutcomePayload = z.enum(SEND_OUTCOMES)

/** True in the small post-game window, which runs this same frontend. */
export function isPostGameWindow(): boolean {
  return window.location.hash.startsWith(POPUP_ROUTE_HASH)
}

/** Tauri rejects with the Rust side's plain string; callers expect an Error. */
async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch (reason: unknown) {
    throw reason instanceof Error ? reason : new Error(String(reason))
  }
}

class TauriLeagueClientLink implements LeagueClientLink {
  async status(): Promise<ClientStatus> {
    return ClientStatusPayload.parse(await call<unknown>('client_status'))
  }

  onStatus(handler: (status: ClientStatus) => void): Promise<Unlisten> {
    return listen<unknown>(STATUS_EVENT, (event) => {
      const parsed = ClientStatusPayload.safeParse(event.payload)
      if (parsed.success) handler(parsed.data)
    })
  }

  onPhase(handler: (phase: string) => void): Promise<Unlisten> {
    return listen<unknown>(PHASE_EVENT, (event) => {
      if (typeof event.payload === 'string') handler(event.payload)
    })
  }

  onChampSelect(handler: (session: unknown) => void): Promise<Unlisten> {
    return listen<unknown>(CHAMP_SELECT_EVENT, (event) => handler(event.payload))
  }

  onHotkey(handler: () => void): Promise<Unlisten> {
    return listen(HOTKEY_EVENT, () => handler())
  }

  onWriteReview(handler: (game: Game) => void): Promise<Unlisten> {
    return listen<unknown>(WRITE_REVIEW_EVENT, (event) => {
      const parsed = GameSummary.safeParse(event.payload)
      if (parsed.success) handler(parsed.data)
    })
  }

  get(path: string): Promise<unknown> {
    return call<unknown>('client_get', { path })
  }

  async sendRunePage(page: RunePageToSend): Promise<SendOutcome> {
    return SendOutcomePayload.parse(await call<unknown>('client_send_rune_page', { page }))
  }

  setHotkey(shortcut: string): Promise<void> {
    return call<void>('set_champ_select_hotkey', { shortcut })
  }

  openPostGamePopup(game: Game): Promise<void> {
    return call<void>('open_post_game_popup', { context: game })
  }

  closePostGamePopup(): Promise<void> {
    return call<void>('close_post_game_popup')
  }

  focusMainWindow(): Promise<void> {
    return call<void>('focus_main_window')
  }

  async postGameContext(): Promise<Game | undefined> {
    const parsed = GameSummary.safeParse(await call<unknown>('post_game_context'))
    return parsed.success ? parsed.data : undefined
  }

  async answerWriteReview(game: Game): Promise<void> {
    await emit(WRITE_REVIEW_EVENT, game)
    await this.closePostGamePopup()
  }
}

export function createLeagueClientLink(): LeagueClientLink {
  return isTauri() ? new TauriLeagueClientLink() : new NoLeagueClientLink()
}
