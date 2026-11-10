import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from '@/router'
import { useChampionStore } from '@/stores/champions'
import { useClientStore } from '@/stores/client'
import { useNotebookStore } from '@/stores/notebook'
import { useRuneStore } from '@/stores/runes'
import { useSettingsStore } from '@/stores/settings'
import { useUpdateStore } from '@/stores/updates'
import { useAiStore } from '@/stores/ai'
import { useAbilityStore } from '@/stores/abilities'
import { createAbilityCache } from '@/tauri/abilityCache'
import { createChampionCache, fetchText } from '@/tauri/championCache'
import { createSettingsStore } from '@/tauri/createSettingsStore'
import { createLeagueClientLink, isPostGameWindow } from '@/tauri/leagueClient'
import { startClientFlow } from '@/tauri/leagueClientFlow'
import { createUpdateSource } from '@/tauri/updates'
import { createAiGateway } from '@/tauri/ai'
import { AI_ADD_ON_AVAILABLE } from '@/data/ai'
import { createRuneCache } from '@/tauri/runeCache'
import { openNotebookFromSettings } from '@/tauri/notebookLocation'
import { useToast } from '@/composables/useToast'
import { applyTheme } from '@/utils/theme'
import '@/assets/main.css'

const pinia = createPinia()
const toast = useToast()
const app = createApp(App).use(pinia).use(router)

const settingsStore = useSettingsStore(pinia)
const championStore = useChampionStore(pinia)
const notebookStore = useNotebookStore(pinia)
const runeStore = useRuneStore(pinia)
const clientStore = useClientStore(pinia)
const updateStore = useUpdateStore(pinia)
const aiStore = useAiStore(pinia)
const abilityStore = useAbilityStore(pinia)
const clientLink = createLeagueClientLink()

// Bundled champion data is ready at once; the theme follows the system until
// settings load. Everything else arrives in the background.
championStore.initialize()
watch(() => settingsStore.theme, applyTheme, { immediate: true })

async function bootstrap(): Promise<void> {
  await settingsStore.initialize(await createSettingsStore())

  // The AI add-on only looks up whether a key exists; it is off until turned on.
  if (AI_ADD_ON_AVAILABLE) await aiStore.initialize(createAiGateway())

  // The League client: status, champ select, hotkey, post-game popup.
  await clientStore.initialize(clientLink)
  startClientFlow({ client: clientStore, settings: settingsStore, router, link: clientLink })
  clientStore.applyHotkey(settingsStore.champSelectHotkey).catch((error: unknown) => {
    console.warn('Could not set the champ select hotkey', error)
  })

  // The notebook load error is shown by App.vue via loadError. Log for diagnostics.
  await openNotebookFromSettings(settingsStore, notebookStore).catch((error: unknown) => {
    console.error('Could not open the notebook', error)
  })

  // Data Dragon check: fresh, then cache, then the bundle. Never blocks the UI.
  await championStore.refresh(await createChampionCache(), fetchText)
  if (championStore.dataVersion) {
    await runeStore.refresh(championStore.dataVersion, await createRuneCache(), fetchText)
    await abilityStore.refresh(championStore.dataVersion, await createAbilityCache(), fetchText)
  }

  // One update check per start. A newer release is offered in Settings, never forced.
  await updateStore.initialize(createUpdateSource())
  const update = await updateStore.check()
  if (update) toast.show(`Version ${update.version} is ready. Install it from Settings.`)
}

/** The post-game popup needs champion names and the theme, nothing else. */
async function bootstrapPopup(): Promise<void> {
  await settingsStore.initialize(await createSettingsStore())
  await router.isReady()
  app.mount('#app')
}

if (isPostGameWindow()) {
  void bootstrapPopup()
} else {
  void bootstrap()
  app.mount('#app')
}
