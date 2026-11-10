import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import sample from '@/test/fixtures/championFullSample.json'
import { championFullUrl } from '@/data/dataDragon'
import { useAbilityStore } from './abilities'

describe('useAbilityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts from the bundle with the curated marks applied', () => {
    const store = useAbilityStore()
    expect(store.source).toBe('bundled')
    expect(store.patch).toMatch(/^\d+\.\d+$/)
    const rows = store.rowsFor('Yone')
    expect(rows.map((row) => row.slot)).toEqual(['Q', 'W', 'E', 'R'])
    expect(rows[0]!.scaling).toBe('attack_speed')
  })

  it('answers an empty list for an unknown champion', () => {
    expect(useAbilityStore().rowsFor('Nobody')).toEqual([])
  })

  it('builds the icon url from the data version', () => {
    const store = useAbilityStore()
    expect(store.iconUrlOf('LeblancW.png')).toContain(
      `/cdn/${store.dataVersion}/img/spell/LeblancW.png`,
    )
  })

  it('refreshes to a newer version and remembers the problem when offline', async () => {
    const store = useAbilityStore()
    const newer = '99.1.1'
    await store.refresh(
      newer,
      { read: async () => undefined, write: async () => {} },
      async (url) => {
        if (url !== championFullUrl(newer)) throw new Error(`Unexpected url ${url}`)
        return JSON.stringify({ ...sample, version: newer })
      },
    )
    expect(store.source).toBe('fresh')
    expect(store.dataVersion).toBe(newer)
    expect(store.lastProblem).toBeUndefined()

    await store.refresh(
      '99.2.1',
      { read: async () => undefined, write: async () => {} },
      async () => {
        throw new Error('offline')
      },
    )
    expect(store.source).toBe('bundled')
    expect(store.lastProblem).toBe('Could not download ability data for the new patch.')
  })
})
