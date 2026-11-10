import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from './settings'
import { MemorySettingsStore } from '@/persistence'
import { DEFAULT_SETTINGS } from '@/schema/settings'

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts from defaults and persists changes', async () => {
    const persistence = new MemorySettingsStore()
    const store = useSettingsStore()
    await store.initialize(persistence)
    expect(store.theme).toBe('system')

    await store.setTheme('dark')
    await store.setNotebookDirectory('D:/OneDrive/notebook')
    expect(await persistence.load()).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      notebookDirectory: 'D:/OneDrive/notebook',
    })

    await store.setNotebookDirectory(undefined)
    expect(store.notebookDirectory).toBeUndefined()
    expect('notebookDirectory' in (await persistence.load())).toBe(false)
  })

  it('keeps the client settings when the folder changes', async () => {
    const persistence = new MemorySettingsStore()
    const store = useSettingsStore()
    await store.initialize(persistence)
    expect(store.postGamePopup).toBe(true)

    await store.setPostGamePopup(false)
    await store.setChampSelectHotkey('CommandOrControl+Alt+N')
    await store.setNotebookDirectory('D:/notebook')
    expect(await persistence.load()).toEqual({
      ...DEFAULT_SETTINGS,
      postGamePopup: false,
      champSelectHotkey: 'CommandOrControl+Alt+N',
      notebookDirectory: 'D:/notebook',
    })
  })
})
