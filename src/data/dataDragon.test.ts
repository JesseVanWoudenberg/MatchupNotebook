import { describe, expect, it } from 'vitest'
import type { ChampionSnapshot } from './champions'
import {
  VERSIONS_URL,
  championListUrl,
  compareDataDragonVersions,
  parseChampionList,
  parseVersions,
  resolveChampionData,
  type ChampionCache,
} from './dataDragon'

const bundled: ChampionSnapshot = {
  version: '16.20.1',
  champions: [{ id: 'Taliyah', key: 163, name: 'Taliyah' }],
}

const versionsJson = JSON.stringify(['16.21.1', '16.20.1', '16.19.1', 'lolpatch_7.20', '0.154.3'])

const championJson = (version: string) =>
  JSON.stringify({
    version,
    data: {
      Taliyah: { id: 'Taliyah', key: '163', name: 'Taliyah' },
      MonkeyKing: { id: 'MonkeyKing', key: '62', name: 'Wukong' },
    },
  })

class FakeCache implements ChampionCache {
  snapshot: ChampionSnapshot | undefined
  failReads = false
  constructor(snapshot?: ChampionSnapshot) {
    this.snapshot = snapshot
  }
  async read() {
    if (this.failReads) throw new Error('cache unreadable')
    return this.snapshot
  }
  async write(snapshot: ChampionSnapshot) {
    this.snapshot = snapshot
  }
}

const online =
  (latest = '16.21.1') =>
  async (url: string) => {
    if (url === VERSIONS_URL) return versionsJson
    if (url === championListUrl(latest)) return championJson(latest)
    throw new Error(`Unexpected url ${url}`)
  }

const offline = async () => {
  throw new Error('no network')
}

describe('parseVersions', () => {
  it('keeps real versions in order and drops junk entries', () => {
    expect(parseVersions(versionsJson)).toEqual(['16.21.1', '16.20.1', '16.19.1', '0.154.3'])
  })
})

describe('parseChampionList', () => {
  it('builds a compact, sorted snapshot with numeric keys', () => {
    const snapshot = parseChampionList(championJson('16.21.1'), ['16.21.1'])
    expect(snapshot.version).toBe('16.21.1')
    expect(snapshot.champions).toEqual([
      { id: 'Taliyah', key: 163, name: 'Taliyah' },
      { id: 'MonkeyKing', key: 62, name: 'Wukong' },
    ])
    expect(snapshot.knownVersions).toEqual(['16.21.1'])
  })
})

describe('compareDataDragonVersions', () => {
  it('compares numerically', () => {
    expect(compareDataDragonVersions('16.20.1', '16.9.1')).toBeGreaterThan(0)
    expect(compareDataDragonVersions('16.20.1', '16.20.1')).toBe(0)
    expect(compareDataDragonVersions('15.24.1', '16.1.1')).toBeLessThan(0)
  })
})

describe('resolveChampionData', () => {
  it('downloads and caches a newer patch', async () => {
    const cache = new FakeCache()
    const result = await resolveChampionData(bundled, cache, online())
    expect(result.source).toBe('fresh')
    expect(result.snapshot.version).toBe('16.21.1')
    expect(cache.snapshot?.version).toBe('16.21.1')
  })

  it('uses the cache when offline', async () => {
    const cached = { ...bundled, version: '16.21.1', knownVersions: ['16.21.1'] }
    const result = await resolveChampionData(bundled, new FakeCache(cached), offline)
    expect(result.source).toBe('cache')
    expect(result.snapshot.version).toBe('16.21.1')
  })

  it('falls back to the bundle when offline with no cache', async () => {
    const problems: string[] = []
    const result = await resolveChampionData(bundled, new FakeCache(), offline, (message) =>
      problems.push(message),
    )
    expect(result.source).toBe('bundled')
    expect(problems).toEqual(['Could not check Data Dragon for a newer patch.'])
  })

  it('ignores a cache that is older than the bundle', async () => {
    const stale = { ...bundled, version: '16.10.1' }
    const result = await resolveChampionData(bundled, new FakeCache(stale), offline)
    expect(result.source).toBe('bundled')
  })

  it('does not download when the bundle is already current, but learns the version list', async () => {
    const fetches: string[] = []
    const fetchText = async (url: string) => {
      fetches.push(url)
      if (url === VERSIONS_URL) return JSON.stringify(['16.20.1', '16.19.1'])
      throw new Error(`Unexpected url ${url}`)
    }
    const result = await resolveChampionData(bundled, new FakeCache(), fetchText)
    expect(fetches).toEqual([VERSIONS_URL])
    expect(result.source).toBe('bundled')
    expect(result.snapshot.knownVersions).toEqual(['16.20.1', '16.19.1'])
  })

  it('survives an unreadable cache', async () => {
    const cache = new FakeCache()
    cache.failReads = true
    const problems: string[] = []
    const result = await resolveChampionData(bundled, cache, online(), (message) =>
      problems.push(message),
    )
    expect(result.source).toBe('fresh')
    expect(problems).toEqual(['Could not read the champion cache.'])
  })
})
