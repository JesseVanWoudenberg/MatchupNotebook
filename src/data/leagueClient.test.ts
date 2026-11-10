import { describe, expect, it } from 'vitest'
import {
  GameSummary,
  gameFromChampSelect,
  isInGamePhase,
  isPostGamePhase,
  mergeGameSummaries,
  parseChampSelect,
  parseGameFromSession,
  positionToRole,
  type GameSummary as GameSummaryType,
} from './leagueClient'

const KEYS: Record<number, string> = { 163: 'Taliyah', 157: 'Yasuo', 238: 'Zed', 64: 'LeeSin' }
const champFor = (key: number) => KEYS[key]

function session(overrides: Record<string, unknown> = {}) {
  return {
    localPlayerCellId: 2,
    myTeam: [
      { cellId: 0, championId: 64, championPickIntent: 0, assignedPosition: 'jungle' },
      { cellId: 2, championId: 163, championPickIntent: 0, assignedPosition: 'middle' },
    ],
    theirTeam: [
      { cellId: 5, championId: 157, assignedPosition: '' },
      { cellId: 6, championId: 0, assignedPosition: '' },
      { cellId: 7, championId: 238, assignedPosition: '' },
    ],
    timer: { phase: 'BAN_PICK' },
    ...overrides,
  }
}

describe('phases', () => {
  it('knows which phases are in a game and which come after', () => {
    expect(isInGamePhase('InProgress')).toBe(true)
    expect(isInGamePhase('ChampSelect')).toBe(false)
    expect(isPostGamePhase('EndOfGame')).toBe(true)
    expect(isPostGamePhase('PreEndOfGame')).toBe(true)
    expect(isPostGamePhase('Lobby')).toBe(false)
  })

  it('maps Riot positions to lanes', () => {
    expect(positionToRole('middle')).toBe('mid')
    expect(positionToRole('UTILITY')).toBe('support')
    expect(positionToRole('bottom')).toBe('bot')
    expect(positionToRole('')).toBeUndefined()
    expect(positionToRole(undefined)).toBeUndefined()
    expect(positionToRole('fill')).toBeUndefined()
  })
})

describe('parseChampSelect', () => {
  it('finds your lock-in, your lane and the revealed enemies', () => {
    expect(parseChampSelect(session(), champFor)).toEqual({
      myChamp: 'Taliyah',
      isLocked: true,
      role: 'mid',
      enemies: ['Yasuo', 'Zed'],
    })
  })

  it('uses your hover before you lock in', () => {
    const hovering = session({
      myTeam: [{ cellId: 2, championId: 0, championPickIntent: 163, assignedPosition: '' }],
    })
    expect(parseChampSelect(hovering, champFor)).toEqual({
      myChamp: 'Taliyah',
      isLocked: false,
      enemies: ['Yasuo', 'Zed'],
    })
  })

  it('skips champions the data does not know', () => {
    const unknown = session({ theirTeam: [{ cellId: 5, championId: 99999 }] })
    expect(parseChampSelect(unknown, champFor)?.enemies).toEqual([])
  })

  it('returns undefined for null and for other shapes', () => {
    expect(parseChampSelect(null, champFor)).toBeUndefined()
    expect(parseChampSelect({ myTeam: [] }, champFor)).toBeUndefined()
  })

  it('turns a finished champ select into a game summary', () => {
    const state = parseChampSelect(session(), champFor)!
    expect(gameFromChampSelect(state)).toEqual({
      myChamp: 'Taliyah',
      role: 'mid',
      enemies: ['Yasuo', 'Zed'],
    })
    expect(gameFromChampSelect({ isLocked: false, enemies: [] })).toBeUndefined()
  })
})

describe('parseGameFromSession', () => {
  const gameflow = {
    phase: 'EndOfGame',
    gameData: {
      teamOne: [{ championId: 157, puuid: 'p-yasuo', selectedPosition: 'MIDDLE' }],
      teamTwo: [
        { championId: 163, puuid: 'p-me', summonerId: 42, selectedPosition: 'MIDDLE' },
        { championId: 64, puuid: 'p-lee', selectedPosition: 'JUNGLE' },
      ],
    },
  }

  it('finds you by puuid and lists the other team', () => {
    expect(parseGameFromSession(gameflow, { puuid: 'p-me' }, champFor)).toEqual({
      myChamp: 'Taliyah',
      role: 'mid',
      enemies: ['Yasuo'],
    })
  })

  it('falls back to the summoner id, whichever type it has', () => {
    expect(parseGameFromSession(gameflow, { summonerId: '42' }, champFor)?.myChamp).toBe('Taliyah')
  })

  it('returns undefined when you are not in the game or the data is off', () => {
    expect(parseGameFromSession(gameflow, { puuid: 'someone-else' }, champFor)).toBeUndefined()
    expect(parseGameFromSession({ errorCode: 'RPC_ERROR' }, { puuid: 'p-me' }, champFor)).toBe(
      undefined,
    )
  })
})

describe('GameSummary', () => {
  it('accepts the popup context and rejects extras', () => {
    expect(GameSummary.safeParse({ myChamp: 'Taliyah', enemies: [] }).success).toBe(true)
    expect(GameSummary.safeParse({ myChamp: 'Taliyah', enemies: [], extra: 1 }).success).toBe(false)
  })
})

describe('mergeGameSummaries', () => {
  const fromChampSelect: GameSummaryType = {
    myChamp: 'Taliyah',
    role: 'mid',
    enemies: ['Yasuo', 'Zed'],
    opponent: 'Zed',
  }
  const fromSession: GameSummaryType = { myChamp: 'Taliyah', role: 'top', enemies: ['Hwei'] }

  it('prefers champ select where both speak', () => {
    expect(mergeGameSummaries(fromChampSelect, fromSession)).toEqual(fromChampSelect)
  })

  it('takes enemies and the lane from the session when champ select had none', () => {
    const bare: GameSummaryType = { myChamp: 'Taliyah', enemies: [], opponent: 'Zed' }
    expect(mergeGameSummaries(bare, fromSession)).toEqual({
      myChamp: 'Taliyah',
      role: 'top',
      enemies: ['Hwei'],
    })
  })

  it('trusts the session over a champ select for another champion', () => {
    const other: GameSummaryType = { ...fromSession, myChamp: 'Ahri' }
    expect(mergeGameSummaries(fromChampSelect, other)).toEqual(other)
  })

  it('works with either side missing', () => {
    expect(mergeGameSummaries(undefined, fromSession)).toEqual(fromSession)
    expect(mergeGameSummaries(fromChampSelect, undefined)).toEqual(fromChampSelect)
    expect(mergeGameSummaries(undefined, undefined)).toBeUndefined()
  })
})
