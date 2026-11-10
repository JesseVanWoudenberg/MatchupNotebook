import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/schema/settings'
import { FileSettingsStore, MemorySettingsStore, parseSettings } from './settingsStore'
import { FakeAppFs } from '@/test/fakeAppFs'

describe('parseSettings', () => {
  it('accepts a valid file', () => {
    const text = JSON.stringify({ schemaVersion: 1, theme: 'dark', notebookDirectory: 'D:/nb' })
    expect(parseSettings(text)).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      notebookDirectory: 'D:/nb',
    })
  })
  it('falls back to defaults on junk or unknown fields', () => {
    expect(parseSettings('{ broken')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{"schemaVersion":1,"theme":"neon"}')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{"schemaVersion":1,"theme":"dark","email":"x"}')).toEqual(
      DEFAULT_SETTINGS,
    )
  })
})

describe('FileSettingsStore', () => {
  it('loads defaults when there is no file', async () => {
    const store = new FileSettingsStore(new FakeAppFs(), 'C:/app')
    expect(await store.load()).toEqual(DEFAULT_SETTINGS)
  })
  it('round-trips settings and creates the folder', async () => {
    const fs = new FakeAppFs()
    const store = new FileSettingsStore(fs, 'C:/app')
    await store.save({ ...DEFAULT_SETTINGS, theme: 'light' })
    expect(fs.directories.has('C:/app')).toBe(true)
    expect(await store.load()).toEqual({ ...DEFAULT_SETTINGS, theme: 'light' })
  })
})

describe('MemorySettingsStore', () => {
  it('round-trips', async () => {
    const store = new MemorySettingsStore()
    expect(await store.load()).toEqual(DEFAULT_SETTINGS)
    await store.save({ ...DEFAULT_SETTINGS, theme: 'dark' })
    expect((await store.load()).theme).toBe('dark')
  })
})
