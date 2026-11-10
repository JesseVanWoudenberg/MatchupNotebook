import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import LivePage from '@/pages/LivePage.vue'
import MatchupPage from '@/pages/MatchupPage.vue'
import PostGamePage from '@/pages/PostGamePage.vue'
import ReviewPage from '@/pages/ReviewPage.vue'
import ReviewsPage from '@/pages/ReviewsPage.vue'
import RunePageEditorPage from '@/pages/RunePageEditorPage.vue'
import SkillOrderEditorPage from '@/pages/SkillOrderEditorPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'

/**
 * Hash history: the app is served from a file-like origin inside Tauri, so
 * there is no server to rewrite deep links.
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'Home', component: HomePage },
    { path: '/matchup/:myChamp/:enemy?', name: 'Matchup', component: MatchupPage },
    // The focused page for champ select and the game; follows the client on its own.
    { path: '/live', name: 'Live', component: LivePage },
    { path: '/reviews/:myChamp/:enemy?', name: 'Reviews', component: ReviewsPage },
    { path: '/review/new/:myChamp/:enemy?', name: 'NewReview', component: ReviewPage },
    { path: '/review/:id', name: 'Review', component: ReviewPage },
    { path: '/rune-page/new/:myChamp/:enemy?', name: 'NewRunePage', component: RunePageEditorPage },
    { path: '/rune-page/:id', name: 'RunePage', component: RunePageEditorPage },
    {
      path: '/skill-order/new/:myChamp/:enemy?',
      name: 'NewSkillOrder',
      component: SkillOrderEditorPage,
    },
    { path: '/skill-order/:id', name: 'SkillOrder', component: SkillOrderEditorPage },
    { path: '/settings', name: 'Settings', component: SettingsPage },
    // Only ever shown in the small post-game window the Rust side opens.
    { path: '/post-game', name: 'PostGame', component: PostGamePage },
  ],
})

export default router
