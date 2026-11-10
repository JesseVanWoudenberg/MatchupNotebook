import type {
  ClientStatus,
  GameSummary,
  LeagueClientLink,
  SendOutcome,
  Unlisten,
} from '@/data/leagueClient'

/** A League client link whose events the test fires by hand. */
export class FakeLeagueClientLink implements LeagueClientLink {
  statusHandler?: (status: ClientStatus) => void
  phaseHandler?: (phase: string) => void
  champSelectHandler?: (session: unknown) => void
  hotkeyHandler?: () => void
  writeReviewHandler?: (game: GameSummary) => void
  responses: Record<string, unknown> = {}

  async status(): Promise<ClientStatus> {
    return { connected: true, phase: 'None' }
  }
  async onStatus(handler: (status: ClientStatus) => void): Promise<Unlisten> {
    this.statusHandler = handler
    return () => {}
  }
  async onPhase(handler: (phase: string) => void): Promise<Unlisten> {
    this.phaseHandler = handler
    return () => {}
  }
  async onChampSelect(handler: (session: unknown) => void): Promise<Unlisten> {
    this.champSelectHandler = handler
    return () => {}
  }
  async onHotkey(handler: () => void): Promise<Unlisten> {
    this.hotkeyHandler = handler
    return () => {}
  }
  async onWriteReview(handler: (game: GameSummary) => void): Promise<Unlisten> {
    this.writeReviewHandler = handler
    return () => {}
  }
  async get(path: string): Promise<unknown> {
    if (!(path in this.responses)) throw new Error(`404 ${path}`)
    return this.responses[path]
  }
  async sendRunePage(): Promise<SendOutcome> {
    return 'added'
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

/** The client's champ select session, reduced to what the parser reads. */
export function champSelectSession(
  myChampionKey: number | undefined,
  enemyKeys: number[],
  position = 'middle',
): unknown {
  return {
    localPlayerCellId: 0,
    myTeam: [
      {
        cellId: 0,
        ...(myChampionKey !== undefined && { championId: myChampionKey }),
        assignedPosition: position,
      },
    ],
    theirTeam: enemyKeys.map((championId, index) => ({ cellId: 5 + index, championId })),
  }
}
