import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick, defineComponent } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { MemorySettingsStore } from '@/persistence'
import { DEFAULT_SETTINGS } from '@/schema/settings'
import { useChampionStore } from '@/stores/champions'
import { useClientStore } from '@/stores/client'
import { useSettingsStore } from '@/stores/settings'
import { FakeLeagueClientLink, champSelectSession } from '@/test/fakeLeagueClientLink'
import { startClientFlow } from './leagueClientFlow'

const Blank = defineComponent({ render: () => null })

/** The app's routes, with blank pages: the flow only reads names, params and query. */
function testRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: Blank },
      { path: '/matchup/:myChamp/:enemy?', name: 'Matchup', component: Blank },
      { path: '/live', name: 'Live', component: Blank },
      { path: '/review/new/:myChamp/:enemy?', name: 'NewReview', component: Blank },
      { path: '/settings', name: 'Settings', component: Blank },
    ],
  })
}

describe('startClientFlow', () => {
  let link: FakeLeagueClientLink
  let router: Router
  let keyOf: (id: string) => number

  async function boot(liveView: boolean): Promise<void> {
    setActivePinia(createPinia())
    const champions = useChampionStore()
    champions.initialize()
    keyOf = (id) => champions.get(id)!.key
    const client = useClientStore()
    const settings = useSettingsStore()
    await settings.initialize(new MemorySettingsStore({ ...DEFAULT_SETTINGS, liveView }))
    link = new FakeLeagueClientLink()
    await client.initialize(link)
    router = testRouter()
    await router.push({ name: 'Home' })
    startClientFlow({ client, settings, router, link })
  }

  /** Watchers run on the next tick and router navigation finishes a few microtasks later. */
  async function settle(): Promise<void> {
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  async function phase(next: string): Promise<void> {
    link.phaseHandler?.(next)
    await settle()
  }

  async function champSelect(myChamp: string | undefined, position: string): Promise<void> {
    link.champSelectHandler?.(
      champSelectSession(myChamp === undefined ? undefined : keyOf(myChamp), [], position),
    )
    await settle()
  }

  describe('with the live view on', () => {
    beforeEach(() => boot(true))

    it('opens the live view when champ select starts and stays there through the game', async () => {
      await phase('ChampSelect')
      expect(router.currentRoute.value.name).toBe('Live')
      await champSelect('Leblanc', 'middle')
      expect(router.currentRoute.value.name).toBe('Live')
      await phase('InProgress')
      expect(router.currentRoute.value.name).toBe('Live')
    })

    it('hands you the matchup page of that game when it ends', async () => {
      await phase('ChampSelect')
      await champSelect('Leblanc', 'top')
      await phase('InProgress')
      await phase('EndOfGame')
      const route = router.currentRoute.value
      expect(route.name).toBe('Matchup')
      expect(route.params.myChamp).toBe('Leblanc')
      expect(route.query.role).toBe('top')
    })

    it('joins the live view from a matchup page when the game starts', async () => {
      await phase('ChampSelect')
      await router.push({ name: 'Matchup', params: { myChamp: 'Leblanc', enemy: '' } })
      await phase('InProgress')
      expect(router.currentRoute.value.name).toBe('Live')
    })

    it('never moves you off a page that is not Home, a matchup or the live view', async () => {
      await router.push({ name: 'Settings' })
      await phase('ChampSelect')
      await champSelect('Leblanc', 'middle')
      expect(router.currentRoute.value.name).toBe('Settings')
    })

    it('answers the hotkey with the live view', async () => {
      link.hotkeyHandler?.()
      await settle()
      expect(router.currentRoute.value.name).toBe('Live')
    })
  })

  describe('with the live view off', () => {
    beforeEach(() => boot(false))

    it('follows your pick into its matchup with the lane', async () => {
      await phase('ChampSelect')
      await champSelect('Leblanc', 'middle')
      const route = router.currentRoute.value
      expect(route.name).toBe('Matchup')
      expect(route.params.myChamp).toBe('Leblanc')
      expect(route.query.role).toBe('mid')
    })

    it('follows a position swap while the pick stays the same', async () => {
      await phase('ChampSelect')
      await champSelect('Leblanc', 'middle')
      await champSelect('Leblanc', 'top')
      const route = router.currentRoute.value
      expect(route.params.myChamp).toBe('Leblanc')
      expect(route.query.role).toBe('top')
    })

    it('leaves the last matchup when a new champ select starts', async () => {
      await router.push({ name: 'Matchup', params: { myChamp: 'Leblanc', enemy: 'Zed' } })
      await phase('ChampSelect')
      expect(router.currentRoute.value.name).toBe('Home')
    })

    it('keeps the hover when it arrives before the phase change', async () => {
      await champSelect('Leblanc', 'middle')
      await phase('ChampSelect')
      const route = router.currentRoute.value
      expect(route.name).toBe('Matchup')
      expect(route.params.myChamp).toBe('Leblanc')
    })

    it('stays on the matchup page when the game starts', async () => {
      await phase('ChampSelect')
      await champSelect('Leblanc', 'middle')
      await phase('InProgress')
      expect(router.currentRoute.value.name).toBe('Matchup')
    })
  })
})
