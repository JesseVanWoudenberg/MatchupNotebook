import { watch } from 'vue'
import type { RouteLocationRaw, Router } from 'vue-router'
import {
  CHAMP_SELECT_PHASE,
  isInGamePhase,
  isLivePhase,
  isPostGamePhase,
  type LeagueClientLink,
} from '@/data/leagueClient'
import { matchupRoute } from '@/router/matchupRoute'
import type { useClientStore } from '@/stores/client'
import type { useSettingsStore } from '@/stores/settings'

export interface ClientFlowDeps {
  client: ReturnType<typeof useClientStore>
  settings: ReturnType<typeof useSettingsStore>
  router: Router
  link: LeagueClientLink
}

/** Pages that may jump to the live view or the champ select matchup on their own. Editors never do. */
const FOLLOW_ROUTES: readonly string[] = ['Home', 'Matchup', 'Live']
const LIVE_ROUTE = 'Live'

/**
 * What the main window does with what the client says: follow champ select,
 * answer the hotkey, offer a review when a game ends. Runs once at startup.
 */
export function startClientFlow({ client, settings, router, link }: ClientFlowDeps): void {
  function champSelectMatchup(): RouteLocationRaw | undefined {
    const state = client.champSelect
    if (!state?.myChamp) return undefined
    return matchupRoute('Matchup', {
      myChamp: state.myChamp,
      ...(state.role !== undefined && { role: state.role }),
    })
  }

  function isFollowing(): boolean {
    return FOLLOW_ROUTES.includes(String(router.currentRoute.value.name))
  }

  function isOnLiveView(): boolean {
    return router.currentRoute.value.name === LIVE_ROUTE
  }

  /** Where champ select and the game take you: the live view, or the matchup page without it. */
  function livePage(): RouteLocationRaw {
    if (settings.liveView) return { name: LIVE_ROUTE }
    return champSelectMatchup() ?? { name: 'Home' }
  }

  // Follow your pick and your lane while you browse, also after a position
  // swap. The live view follows the client by itself. Never while you are
  // writing something.
  watch(
    () => [client.champSelect?.myChamp, client.champSelect?.role] as const,
    ([myChamp, role]) => {
      const route = router.currentRoute.value
      if (!myChamp || !isFollowing() || isOnLiveView()) return
      if (settings.liveView) {
        void router.push({ name: LIVE_ROUTE })
        return
      }
      const shown = route.name === 'Matchup' && route.params.myChamp === myChamp
      if (shown && (route.query.role ?? undefined) === role) return
      const target = champSelectMatchup()
      if (target) void router.push(target)
    },
  )

  // The hotkey: the Rust side brings the window up, the page follows.
  void link.onHotkey(() => {
    void router.push(livePage())
  })

  // Game over: offer a review, unless turned off. Only for a change seen
  // live, so starting the app on the stats screen does not pop anything.
  watch(
    () => client.phase,
    async (next, previous) => {
      if (next === CHAMP_SELECT_PHASE) {
        // A new game: leave the last matchup behind. Without the live view,
        // the hover wins over Home when it has already arrived.
        if (isFollowing()) void router.push(livePage())
        await link.closePostGamePopup().catch(logQuietly)
        return
      }
      // The game starts: the live view carries on, other browsing pages join it.
      if (isInGamePhase(next) && !isInGamePhase(previous) && settings.liveView && isFollowing()) {
        void router.push({ name: LIVE_ROUTE })
      }
      // The game is over: the live view hands you to that game's matchup page.
      if (!isLivePhase(next) && isLivePhase(previous) && isOnLiveView()) {
        const game = client.lastGame
        void router.push(
          game
            ? matchupRoute('Matchup', {
                myChamp: game.myChamp,
                ...(game.opponent !== undefined && { enemy: game.opponent }),
                ...(game.role !== undefined && { role: game.role }),
              })
            : { name: 'Home' },
        )
      }
      if (previous === '' || !isPostGamePhase(next) || isPostGamePhase(previous)) return
      if (!settings.postGamePopup) return
      const game = await client.resolveLastGame()
      if (game) await link.openPostGamePopup(game).catch(logQuietly)
    },
  )

  // The popup's answer.
  void link.onWriteReview((game) => {
    void router.push(
      matchupRoute('NewReview', {
        myChamp: game.myChamp,
        ...(game.role !== undefined && { role: game.role }),
      }),
    )
    void link.focusMainWindow().catch(logQuietly)
  })
}

/** Client trouble never reaches the user as a message; the status dot is the signal. */
function logQuietly(error: unknown): void {
  console.warn('League client', error)
}
