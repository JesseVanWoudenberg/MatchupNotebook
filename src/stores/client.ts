import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ChampId, RunePage } from '@/schema'
import {
  CHAMP_SELECT_PHASE,
  gameFromChampSelect,
  isInGamePhase,
  isLivePhase,
  isPostGamePhase,
  mergeGameSummaries,
  parseChampSelect,
  parseGameFromSession,
  type ChampSelectState,
  type ClientStatus,
  type GameSummary,
  type LeagueClientLink,
  type SendOutcome,
} from '@/data/leagueClient'
import { useChampionStore } from './champions'

const GAMEFLOW_SESSION_PATH = '/lol-gameflow/v1/session'
const CURRENT_SUMMONER_PATH = '/lol-summoner/v1/current-summoner'

/**
 * What the League client is doing right now. Fed by the Rust side through
 * the link; never writes to the client except `sendRunePage`.
 */
export const useClientStore = defineStore('client', () => {
  const championStore = useChampionStore()
  const isConnected = ref(false)
  const phase = ref('')
  const champSelect = ref<ChampSelectState>()
  const lastGame = ref<GameSummary>()
  let link: LeagueClientLink | undefined
  /** The last champ select seen, kept until a game starts from it. */
  let pendingChampSelect: ChampSelectState | undefined
  /** The enemy clicked during that champ select, if any. */
  const pendingOpponent = ref<ChampId>()
  /** The read of the client's game session at game end, while it runs. */
  let enrichment: Promise<void> | undefined

  const isInChampSelect = computed(() => phase.value === CHAMP_SELECT_PHASE)
  const isLive = computed(() => isLivePhase(phase.value))
  /** The lane opponent you picked: in champ select the click, in game the frozen game's. */
  const opponent = computed(() =>
    isInChampSelect.value ? pendingOpponent.value : lastGame.value?.opponent,
  )

  async function initialize(source: LeagueClientLink): Promise<void> {
    link = source
    await source.onStatus(applyStatus)
    await source.onPhase(applyPhase)
    await source.onChampSelect(applyChampSelect)
    applyStatus(await source.status())
  }

  function applyStatus(status: ClientStatus): void {
    isConnected.value = status.connected
    applyPhase(status.phase)
  }

  function applyPhase(next: string): void {
    const previous = phase.value
    if (next === CHAMP_SELECT_PHASE && previous !== CHAMP_SELECT_PHASE) {
      pendingOpponent.value = undefined
    }
    if (isInGamePhase(next) && !isInGamePhase(previous)) {
      // The game is on: remember who it is against. Without a champ select
      // (the app started mid-game) the client is asked when the game ends.
      lastGame.value = freezeChampSelect()
      pendingChampSelect = undefined
      pendingOpponent.value = undefined
      enrichment = undefined
    }
    if (isPostGamePhase(next) && !isPostGamePhase(previous)) {
      enrichment = enrichLastGame()
    }
    if (next !== CHAMP_SELECT_PHASE) champSelect.value = undefined
    phase.value = next
  }

  function freezeChampSelect(): GameSummary | undefined {
    if (!pendingChampSelect) return undefined
    const game = gameFromChampSelect(pendingChampSelect)
    const chosen = pendingOpponent.value
    if (game && chosen !== undefined && game.enemies.includes(chosen)) {
      game.opponent = chosen
    }
    return game
  }

  function applyChampSelect(session: unknown): void {
    const parsed = parseChampSelect(session, championStore.idForKey)
    if (parsed) pendingChampSelect = parsed
    champSelect.value = parsed
  }

  /**
   * The enemy you clicked as your lane opponent. Undefined clears it. In
   * champ select it waits for the game; in game it corrects the frozen game,
   * which is what the review gets afterwards.
   */
  function chooseOpponent(enemy: ChampId | undefined): void {
    pendingOpponent.value = enemy
    const game = lastGame.value
    if (!isInChampSelect.value && game) {
      if (enemy === undefined) delete game.opponent
      else if (game.enemies.includes(enemy)) game.opponent = enemy
    }
  }

  /**
   * Fills in what champ select could not know: bot enemies, or the whole
   * game when the app started mid-game. Silent on failure.
   */
  async function enrichLastGame(): Promise<void> {
    if (!link) return
    try {
      const [session, summoner] = await Promise.all([
        link.get(GAMEFLOW_SESSION_PATH),
        link.get(CURRENT_SUMMONER_PATH),
      ])
      const fromSession = parseGameFromSession(session, summoner, championStore.idForKey)
      lastGame.value = mergeGameSummaries(lastGame.value, fromSession)
    } catch (error: unknown) {
      console.warn('Could not read the last game from the client', error)
    }
  }

  /** The game just played, once the client has been asked about it. */
  async function resolveLastGame(): Promise<GameSummary | undefined> {
    if (enrichment) await enrichment
    else if (!lastGame.value) await enrichLastGame()
    return lastGame.value
  }

  function requireLink(): LeagueClientLink {
    if (!link) throw new Error('The League client is not available here.')
    return link
  }

  /** The one write to the client. Call it from a button and nowhere else. */
  async function sendRunePage(page: RunePage): Promise<SendOutcome> {
    return requireLink().sendRunePage({
      name: page.name,
      primaryStyleId: page.primaryStyleId,
      subStyleId: page.subStyleId,
      selectedPerkIds: page.selectedPerkIds,
    })
  }

  /** Rejects with a message when the shortcut text is not valid. */
  async function applyHotkey(shortcut: string): Promise<void> {
    await requireLink().setHotkey(shortcut)
  }

  /**
   * For the dev-only simulator in Settings: feeds a phase or a champ select
   * session as if the client had sent it, so the live view can be tried
   * without a second player. Never called by the app itself.
   */
  function simulatePhase(next: string): void {
    applyPhase(next)
  }

  function simulateChampSelect(session: unknown): void {
    applyChampSelect(session)
  }

  return {
    isConnected,
    phase,
    champSelect,
    lastGame,
    isInChampSelect,
    isLive,
    opponent,
    initialize,
    chooseOpponent,
    resolveLastGame,
    sendRunePage,
    applyHotkey,
    simulatePhase,
    simulateChampSelect,
  }
})
