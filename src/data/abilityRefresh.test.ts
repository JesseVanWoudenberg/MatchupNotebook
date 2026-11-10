import { describe, expect, it } from 'vitest'
import sample from '@/test/fixtures/championFullSample.json'
import { parseChampionFull, type AbilitySnapshot } from './abilities'
import { resolveAbilityData, type AbilityCache } from './abilityRefresh'
import { championFullUrl } from './dataDragon'

const bundled: AbilitySnapshot = {
  ...parseChampionFull(JSON.stringify(sample)),
  version: '16.20.1',
}

class FakeCache implements AbilityCache {
  constructor(public snapshot?: AbilitySnapshot) {}
  async read() {
    return this.snapshot
  }
  async write(snapshot: AbilitySnapshot) {
    this.snapshot = snapshot
  }
}

const fetchForVersion = (version: string) => async (url: string) => {
  if (url !== championFullUrl(version)) throw new Error(`Unexpected url ${url}`)
  return JSON.stringify({ ...sample, version })
}

const offline = async () => {
  throw new Error('no network')
}

describe('resolveAbilityData', () => {
  it('keeps the bundle when the target version is not newer', async () => {
    const fetches: string[] = []
    const result = await resolveAbilityData(
      bundled.version,
      bundled,
      new FakeCache(),
      async (url) => {
        fetches.push(url)
        return ''
      },
    )
    expect(result.source).toBe('bundled')
    expect(fetches).toEqual([])
  })

  it('downloads a newer version and writes the cache', async () => {
    const cache = new FakeCache()
    const result = await resolveAbilityData('16.21.1', bundled, cache, fetchForVersion('16.21.1'))
    expect(result.source).toBe('fresh')
    expect(result.snapshot.version).toBe('16.21.1')
    expect(cache.snapshot?.version).toBe('16.21.1')
  })

  it('uses the cache when it already holds the target version', async () => {
    const cache = new FakeCache({ ...bundled, version: '16.21.1' })
    const result = await resolveAbilityData('16.21.1', bundled, cache, offline)
    expect(result.source).toBe('cache')
  })

  it('falls back to the cache, then the bundle, when the download fails', async () => {
    const problems: string[] = []
    const cached = await resolveAbilityData(
      '16.22.1',
      bundled,
      new FakeCache({ ...bundled, version: '16.21.1' }),
      offline,
      (message) => problems.push(message),
    )
    expect(cached.source).toBe('cache')
    const fallback = await resolveAbilityData('16.22.1', bundled, new FakeCache(), offline)
    expect(fallback.source).toBe('bundled')
    expect(problems).toEqual(['Could not download ability data for the new patch.'])
  })

  it('reports a broken cache and carries on', async () => {
    const problems: string[] = []
    const broken: AbilityCache = {
      read: async () => {
        throw new Error('corrupt')
      },
      write: async () => {},
    }
    const result = await resolveAbilityData(
      '16.21.1',
      bundled,
      broken,
      fetchForVersion('16.21.1'),
      (message) => problems.push(message),
    )
    expect(result.source).toBe('fresh')
    expect(problems).toEqual(['Could not read the ability cache.'])
  })
})
