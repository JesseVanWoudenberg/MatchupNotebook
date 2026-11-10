import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_SETTINGS, type AiSettings, type Settings, type Theme } from '@/schema/settings'
import type { SettingsStore } from '@/persistence'

/** App settings with write-through persistence. Theme is applied by the caller watching `theme`. */
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(DEFAULT_SETTINGS)
  let persistence: SettingsStore | undefined

  const theme = computed(() => settings.value.theme)
  const notebookDirectory = computed(() => settings.value.notebookDirectory)
  const postGamePopup = computed(() => settings.value.postGamePopup)
  const liveView = computed(() => settings.value.liveView)
  const showTipPatch = computed(() => settings.value.showTipPatch)
  const champSelectHotkey = computed(() => settings.value.champSelectHotkey)
  const ai = computed(() => settings.value.ai)

  async function initialize(store: SettingsStore): Promise<void> {
    persistence = store
    settings.value = await store.load()
  }

  async function persist(): Promise<void> {
    if (!persistence) throw new Error('The settings store has no persistence yet.')
    await persistence.save(settings.value)
  }

  async function update(changes: Partial<Settings>): Promise<void> {
    settings.value = { ...settings.value, ...changes }
    await persist()
  }

  async function setTheme(next: Theme): Promise<void> {
    await update({ theme: next })
  }

  /** Undefined returns to the default app folder. */
  async function setNotebookDirectory(directory: string | undefined): Promise<void> {
    const next = { ...settings.value }
    delete next.notebookDirectory
    if (directory !== undefined) next.notebookDirectory = directory
    settings.value = next
    await persist()
  }

  async function setPostGamePopup(enabled: boolean): Promise<void> {
    await update({ postGamePopup: enabled })
  }

  async function setLiveView(enabled: boolean): Promise<void> {
    await update({ liveView: enabled })
  }

  async function setShowTipPatch(enabled: boolean): Promise<void> {
    await update({ showTipPatch: enabled })
  }

  /** Validate with the client store first; this only remembers the text. */
  async function setChampSelectHotkey(shortcut: string): Promise<void> {
    await update({ champSelectHotkey: shortcut })
  }

  async function setAi(changes: Partial<AiSettings>): Promise<void> {
    await update({ ai: { ...settings.value.ai, ...changes } })
  }

  return {
    settings,
    theme,
    notebookDirectory,
    postGamePopup,
    liveView,
    showTipPatch,
    champSelectHotkey,
    ai,
    initialize,
    setTheme,
    setNotebookDirectory,
    setPostGamePopup,
    setLiveView,
    setShowTipPatch,
    setChampSelectHotkey,
    setAi,
  }
})
