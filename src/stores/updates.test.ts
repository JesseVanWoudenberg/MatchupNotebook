import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { NoUpdateSource, type AvailableUpdate } from '@/data/updates'
import { useUpdateStore } from './updates'

class FakeSource extends NoUpdateSource {
  next: AvailableUpdate | undefined
  shouldFail = false
  installed = 0

  override async check(): Promise<AvailableUpdate | undefined> {
    if (this.shouldFail) throw new Error('offline')
    return this.next
  }
  override async install(): Promise<void> {
    if (this.shouldFail) throw new Error('bad signature')
    this.installed++
  }
}

describe('useUpdateStore', () => {
  let source: FakeSource

  beforeEach(async () => {
    setActivePinia(createPinia())
    source = new FakeSource()
    await useUpdateStore().initialize(source)
  })

  it('knows the current version and whether a newer one exists', async () => {
    const store = useUpdateStore()
    expect(store.currentVersion).toBe('0.0.0')
    expect(await store.check()).toBeUndefined()
    expect(store.hasChecked).toBe(true)

    source.next = { version: '0.2.0', notes: 'Fixes' }
    expect(await store.check()).toEqual({ version: '0.2.0', notes: 'Fixes' })
    expect(store.available?.version).toBe('0.2.0')
  })

  it('turns a failed check into a message instead of an error', async () => {
    const store = useUpdateStore()
    source.shouldFail = true
    expect(await store.check()).toBeUndefined()
    expect(store.lastProblem).toContain('Could not check')
    expect(store.isChecking).toBe(false)
  })

  it('installs on request and rethrows a failure', async () => {
    const store = useUpdateStore()
    source.next = { version: '0.2.0' }
    await store.check()
    await store.install()
    expect(source.installed).toBe(1)

    source.shouldFail = true
    await expect(store.install()).rejects.toThrow('bad signature')
    expect(store.lastProblem).toContain('could not be installed')
  })
})
