import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { GameSummary } from '@/data/leagueClient'
import { FakeLeagueClientLink, champSelectSession } from '@/test/fakeLeagueClientLink'
import { useChampionStore } from './champions'
import { useClientStore } from './client'

describe('useClientStore', () => {
  let link: FakeLeagueClientLink
  let keyOf: (id: string) => number

  beforeEach(async () => {
    setActivePinia(createPinia())
    const champions = useChampionStore()
    champions.initialize()
    keyOf = (id) => champions.get(id)!.key
    link = new FakeLeagueClientLink()
    await useClientStore().initialize(link)
  })

  function gameSession(myChamp: string, position: string, enemies: string[]) {
    link.responses['/lol-summoner/v1/current-summoner'] = { puuid: 'me' }
    link.responses['/lol-gameflow/v1/session'] = {
      gameData: {
        teamOne: [{ championId: keyOf(myChamp), puuid: 'me', selectedPosition: position }],
        teamTwo: enemies.map((enemy) => ({ championId: keyOf(enemy), puuid: `bot-${enemy}` })),
      },
    }
  }

  it('reads the status once and then follows events', () => {
    const store = useClientStore()
    expect(store.isConnected).toBe(true)
    expect(store.phase).toBe('None')

    link.statusHandler!({ connected: false, phase: '' })
    expect(store.isConnected).toBe(false)
    expect(store.phase).toBe('')
  })

  it('tracks champ select while it lasts', () => {
    const store = useClientStore()
    link.phaseHandler!('ChampSelect')
    link.champSelectHandler!(champSelectSession(keyOf('Taliyah'), [keyOf('Yasuo')]))
    expect(store.isInChampSelect).toBe(true)
    expect(store.champSelect).toEqual({
      myChamp: 'Taliyah',
      isLocked: true,
      role: 'mid',
      enemies: ['Yasuo'],
    })

    link.champSelectHandler!(null)
    expect(store.champSelect).toBeUndefined()
    link.phaseHandler!('Lobby')
    expect(store.isInChampSelect).toBe(false)
  })

  it('remembers the game from champ select once it starts', async () => {
    const store = useClientStore()
    link.phaseHandler!('ChampSelect')
    link.champSelectHandler!(champSelectSession(keyOf('Taliyah'), [keyOf('Yasuo'), keyOf('Zed')]))
    link.champSelectHandler!(null)
    link.phaseHandler!('GameStart')
    link.phaseHandler!('InProgress')
    link.phaseHandler!('EndOfGame')

    const expected: GameSummary = { myChamp: 'Taliyah', role: 'mid', enemies: ['Yasuo', 'Zed'] }
    expect(store.lastGame).toEqual(expected)
    expect(await store.resolveLastGame()).toEqual(expected)
  })

  it('keeps the enemy you clicked in champ select, and only that one', async () => {
    const store = useClientStore()
    link.phaseHandler!('ChampSelect')
    link.champSelectHandler!(champSelectSession(keyOf('Taliyah'), [keyOf('Yasuo'), keyOf('Zed')]))
    store.chooseOpponent('Zed')
    link.phaseHandler!('InProgress')
    link.phaseHandler!('EndOfGame')
    expect((await store.resolveLastGame())?.opponent).toBe('Zed')

    // A clear before the game starts, or a click on someone not in the game, leaves nothing.
    link.phaseHandler!('None')
    link.phaseHandler!('ChampSelect')
    link.champSelectHandler!(champSelectSession(keyOf('Taliyah'), [keyOf('Yasuo')]))
    store.chooseOpponent('Zed')
    link.phaseHandler!('InProgress')
    expect(store.lastGame?.opponent).toBeUndefined()
  })

  it('fills in bot enemies from the game session when champ select had none', async () => {
    const store = useClientStore()
    link.phaseHandler!('ChampSelect')
    link.champSelectHandler!(champSelectSession(keyOf('Taliyah'), []))
    link.phaseHandler!('InProgress')
    gameSession('Taliyah', '', ['Zed'])
    link.phaseHandler!('EndOfGame')
    expect(await store.resolveLastGame()).toEqual({
      myChamp: 'Taliyah',
      role: 'mid',
      enemies: ['Zed'],
    })
  })

  it('asks the client about a game it never saw the champ select of', async () => {
    const store = useClientStore()
    link.phaseHandler!('InProgress')
    expect(store.lastGame).toBeUndefined()

    gameSession('Taliyah', 'TOP', ['Zed'])
    link.phaseHandler!('EndOfGame')
    expect(await store.resolveLastGame()).toEqual({
      myChamp: 'Taliyah',
      role: 'top',
      enemies: ['Zed'],
    })
  })

  it('forgets a stale game when a new one starts without a champ select', () => {
    const store = useClientStore()
    link.phaseHandler!('ChampSelect')
    link.champSelectHandler!(champSelectSession(keyOf('Taliyah'), []))
    link.phaseHandler!('InProgress')
    expect(store.lastGame?.myChamp).toBe('Taliyah')

    link.phaseHandler!('None')
    link.phaseHandler!('InProgress')
    expect(store.lastGame).toBeUndefined()
  })

  it('stays quiet when the client is unreachable', async () => {
    const store = useClientStore()
    link.phaseHandler!('EndOfGame')
    expect(await store.resolveLastGame()).toBeUndefined()
  })

  it('lets you pick and correct the lane opponent in champ select and in game', () => {
    const store = useClientStore()
    link.phaseHandler!('ChampSelect')
    link.champSelectHandler!(champSelectSession(keyOf('Taliyah'), [keyOf('Zed'), keyOf('Ahri')]))
    store.chooseOpponent('Zed')
    expect(store.opponent).toBe('Zed')
    expect(store.isLive).toBe(true)

    link.phaseHandler!('InProgress')
    expect(store.lastGame?.opponent).toBe('Zed')
    expect(store.opponent).toBe('Zed')

    store.chooseOpponent('Ahri')
    expect(store.lastGame?.opponent).toBe('Ahri')
    store.chooseOpponent('Nobody')
    expect(store.lastGame?.opponent).toBe('Ahri')
    store.chooseOpponent(undefined)
    expect(store.lastGame?.opponent).toBeUndefined()

    link.phaseHandler!('EndOfGame')
    expect(store.isLive).toBe(false)
  })
})
