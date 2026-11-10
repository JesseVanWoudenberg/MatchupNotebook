import { z } from 'zod'
import { ChampId, Role, type RunePage } from '@/schema'

/**
 * What the League client tells us, parsed into the notebook's terms. The
 * Rust side forwards the client's JSON as is; this is where it gets checked.
 * Champion ids arrive as Riot's numeric keys and are mapped to string ids.
 */

export const CHAMP_SELECT_PHASE = 'ChampSelect'
const IN_GAME_PHASES = ['GameStart', 'InProgress', 'Reconnect', 'WaitingForStats'] as const
const POST_GAME_PHASES = ['PreEndOfGame', 'EndOfGame'] as const

export function isInGamePhase(phase: string): boolean {
  return (IN_GAME_PHASES as readonly string[]).includes(phase)
}

export function isPostGamePhase(phase: string): boolean {
  return (POST_GAME_PHASES as readonly string[]).includes(phase)
}

/** Champ select and the game itself: the stretch the live view is for. */
export function isLivePhase(phase: string): boolean {
  return phase === CHAMP_SELECT_PHASE || isInGamePhase(phase)
}

/** Riot's position names in champ select and game data, to the notebook's lanes. */
const POSITION_ROLES: Readonly<Record<string, Role>> = {
  top: 'top',
  jungle: 'jungle',
  middle: 'mid',
  mid: 'mid',
  bottom: 'bot',
  bot: 'bot',
  utility: 'support',
  support: 'support',
}

export function positionToRole(position: string | undefined): Role | undefined {
  return position ? POSITION_ROLES[position.toLowerCase()] : undefined
}

/** Riot's numeric champion key to the string id the notebook stores. */
export type ChampionKeyLookup = (key: number) => ChampId | undefined

export interface ClientStatus {
  connected: boolean
  phase: string
}

/** Your side of champ select, as far as the client shows it. */
export interface ChampSelectState {
  /** Your lock-in, or your hover while nothing is locked. */
  myChamp?: ChampId
  isLocked: boolean
  role?: Role
  /** Enemy champions the client has revealed, in seat order. */
  enemies: ChampId[]
}

/** One game, enough to open the right matchup afterwards. */
export const GameSummary = z.strictObject({
  myChamp: ChampId,
  role: Role.optional(),
  enemies: z.array(ChampId),
  /** The enemy you clicked during champ select, if any. Never guessed. */
  opponent: ChampId.optional(),
})
export type GameSummary = z.infer<typeof GameSummary>

const ChampSelectPlayer = z.looseObject({
  cellId: z.number().optional(),
  championId: z.number().optional(),
  championPickIntent: z.number().optional(),
  assignedPosition: z.string().optional(),
})

export const ChampSelectSession = z.looseObject({
  localPlayerCellId: z.number(),
  myTeam: z.array(ChampSelectPlayer),
  theirTeam: z.array(ChampSelectPlayer),
})

/** Undefined when the value is not a champ select session, including null. */
export function parseChampSelect(
  value: unknown,
  champFor: ChampionKeyLookup,
): ChampSelectState | undefined {
  const session = ChampSelectSession.safeParse(value)
  if (!session.success) return undefined
  const { localPlayerCellId, myTeam, theirTeam } = session.data
  const me = myTeam.find((player) => player.cellId === localPlayerCellId)
  const locked = lookup(me?.championId, champFor)
  const hovered = lookup(me?.championPickIntent, champFor)
  const myChamp = locked ?? hovered
  const role = positionToRole(me?.assignedPosition)
  return {
    ...(myChamp !== undefined && { myChamp }),
    isLocked: locked !== undefined,
    ...(role !== undefined && { role }),
    enemies: theirTeam.flatMap((player) => lookup(player.championId, champFor) ?? []),
  }
}

/** What to remember about a game once champ select is over. */
export function gameFromChampSelect(state: ChampSelectState): GameSummary | undefined {
  if (state.myChamp === undefined) return undefined
  return {
    myChamp: state.myChamp,
    ...(state.role !== undefined && { role: state.role }),
    enemies: state.enemies,
  }
}

const GamePlayer = z.looseObject({
  championId: z.number().optional(),
  puuid: z.string().optional(),
  summonerId: z.union([z.number(), z.string()]).optional(),
  selectedPosition: z.string().optional(),
})

/** /lol-gameflow/v1/session, the part that names the teams. */
export const GameflowSession = z.looseObject({
  gameData: z.looseObject({
    teamOne: z.array(GamePlayer).optional(),
    teamTwo: z.array(GamePlayer).optional(),
  }),
})

/** /lol-summoner/v1/current-summoner, the part that identifies you. */
export const CurrentSummoner = z.looseObject({
  puuid: z.string().optional(),
  summonerId: z.union([z.number(), z.string()]).optional(),
})

/**
 * The game from the client's own session, for when the app missed champ
 * select. Undefined when you are not in either team or the data is odd.
 */
export function parseGameFromSession(
  session: unknown,
  summoner: unknown,
  champFor: ChampionKeyLookup,
): GameSummary | undefined {
  const parsedSession = GameflowSession.safeParse(session)
  const parsedSummoner = CurrentSummoner.safeParse(summoner)
  if (!parsedSession.success || !parsedSummoner.success) return undefined
  const me = parsedSummoner.data
  const isMe = (player: z.infer<typeof GamePlayer>) =>
    (me.puuid !== undefined && player.puuid === me.puuid) ||
    (me.summonerId !== undefined && String(player.summonerId) === String(me.summonerId))

  const { teamOne = [], teamTwo = [] } = parsedSession.data.gameData
  const [mine, theirs] = teamOne.some(isMe)
    ? [teamOne, teamTwo]
    : teamTwo.some(isMe)
      ? [teamTwo, teamOne]
      : [undefined, undefined]
  if (!mine || !theirs) return undefined

  const self = mine.find(isMe)
  const myChamp = lookup(self?.championId, champFor)
  if (myChamp === undefined) return undefined
  const role = positionToRole(self?.selectedPosition)
  return {
    myChamp,
    ...(role !== undefined && { role }),
    enemies: theirs.flatMap((player) => lookup(player.championId, champFor) ?? []),
  }
}

/**
 * Champ select knows what you chose; the client's own game session knows
 * who actually played. Champ select wins where both speak, except that a
 * different champion in the session means the champ select was stale.
 */
export function mergeGameSummaries(
  champSelect: GameSummary | undefined,
  session: GameSummary | undefined,
): GameSummary | undefined {
  if (!champSelect) return session
  if (!session) return champSelect
  if (session.myChamp !== champSelect.myChamp) return session
  const role = champSelect.role ?? session.role
  const enemies = champSelect.enemies.length > 0 ? champSelect.enemies : session.enemies
  const opponent = champSelect.opponent
  return {
    myChamp: champSelect.myChamp,
    ...(role !== undefined && { role }),
    enemies,
    ...(opponent !== undefined && enemies.includes(opponent) && { opponent }),
  }
}
function lookup(key: number | undefined, champFor: ChampionKeyLookup): ChampId | undefined {
  return key !== undefined && key > 0 ? champFor(key) : undefined
}

/** The fields the client needs for a rune page. Nothing else leaves the app. */
export type RunePageToSend = Pick<
  RunePage,
  'name' | 'primaryStyleId' | 'subStyleId' | 'selectedPerkIds'
>

export const SEND_OUTCOMES = ['added', 'replaced_same_name', 'replaced_current'] as const
export type SendOutcome = (typeof SEND_OUTCOMES)[number]

export const SEND_OUTCOME_MESSAGES: Readonly<Record<SendOutcome, string>> = {
  added: 'Sent to the client as a new page.',
  replaced_same_name: 'Sent to the client. Your page with the same name was replaced.',
  replaced_current: 'Sent to the client. Your pages were full, so the current one was replaced.',
}

export type Unlisten = () => void

/**
 * The frontend's view of the Rust side. The Tauri implementation lives in
 * src/tauri; tests and the browser get a fake that is never connected.
 */
export interface LeagueClientLink {
  status(): Promise<ClientStatus>
  onStatus(handler: (status: ClientStatus) => void): Promise<Unlisten>
  onPhase(handler: (phase: string) => void): Promise<Unlisten>
  onChampSelect(handler: (session: unknown) => void): Promise<Unlisten>
  onHotkey(handler: () => void): Promise<Unlisten>
  /** The popup's answer, in the main window. */
  onWriteReview(handler: (game: GameSummary) => void): Promise<Unlisten>
  /** Read-only GET against the client. Rejects when not connected. */
  get(path: string): Promise<unknown>
  /** The one write. Only ever called from a button. */
  sendRunePage(page: RunePageToSend): Promise<SendOutcome>
  /** Rejects with a message when the shortcut text is not valid. */
  setHotkey(shortcut: string): Promise<void>
  openPostGamePopup(game: GameSummary): Promise<void>
  closePostGamePopup(): Promise<void>
  focusMainWindow(): Promise<void>
  /** In the popup window: what to show. */
  postGameContext(): Promise<GameSummary | undefined>
  /** In the popup window: tell the main window, then close. */
  answerWriteReview(game: GameSummary): Promise<void>
}

/** Never connected. For the browser and for tests. */
export class NoLeagueClientLink implements LeagueClientLink {
  async status(): Promise<ClientStatus> {
    return { connected: false, phase: '' }
  }
  async onStatus(): Promise<Unlisten> {
    return () => {}
  }
  async onPhase(): Promise<Unlisten> {
    return () => {}
  }
  async onChampSelect(): Promise<Unlisten> {
    return () => {}
  }
  async onHotkey(): Promise<Unlisten> {
    return () => {}
  }
  async onWriteReview(): Promise<Unlisten> {
    return () => {}
  }
  async get(): Promise<unknown> {
    throw new Error('The League client is not available here.')
  }
  async sendRunePage(): Promise<SendOutcome> {
    throw new Error('The League client is not available here.')
  }
  async setHotkey(): Promise<void> {}
  async openPostGamePopup(): Promise<void> {}
  async closePostGamePopup(): Promise<void> {}
  async focusMainWindow(): Promise<void> {}
  async postGameContext(): Promise<GameSummary | undefined> {
    return undefined
  }
  async answerWriteReview(): Promise<void> {}
}
