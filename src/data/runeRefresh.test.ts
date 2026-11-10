import { describe, expect, it } from 'vitest'
import { loadBundledRunes, runesUrl, type RuneSnapshot } from './runes'
import { resolveRuneData, type RuneCache } from './runeRefresh'

const bundled = loadBundledRunes()

class FakeCache implements RuneCache {
  constructor(public snapshot?: RuneSnapshot) {}
  async read() {
    return this.snapshot
  }
  async write(snapshot: RuneSnapshot) {
    this.snapshot = snapshot
  }
}

const fetchForVersion = (version: string) => async (url: string) => {
  if (url !== runesUrl(version)) throw new Error(`Unexpected url ${url}`)
  return JSON.stringify(
    bundled.styles.map((style) => ({
      ...style,
      slots: style.slots.map((runes) => ({ runes })),
    })),
  )
}

const offline = async () => {
  throw new Error('no network')
}

describe('resolveRuneData', () => {
  it('keeps the bundle when the target version is not newer', async () => {
    const fetches: string[] = []
    const result = await resolveRuneData(bundled.version, bundled, new FakeCache(), async (url) => {
      fetches.push(url)
      return ''
    })
    expect(result.source).toBe('bundled')
    expect(fetches).toEqual([])
  })

  it('downloads and caches for a newer version', async () => {
    const cache = new FakeCache()
    const result = await resolveRuneData('16.21.1', bundled, cache, fetchForVersion('16.21.1'))
    expect(result.source).toBe('fresh')
    expect(result.snapshot.version).toBe('16.21.1')
    expect(cache.snapshot?.version).toBe('16.21.1')
  })

  it('uses the cache when it already has the version and skips the download', async () => {
    const cached = { ...bundled, version: '16.21.1' }
    const result = await resolveRuneData('16.21.1', bundled, new FakeCache(cached), offline)
    expect(result.source).toBe('cache')
  })

  it('falls back to the bundle when offline', async () => {
    const problems: string[] = []
    const result = await resolveRuneData('16.21.1', bundled, new FakeCache(), offline, (m) =>
      problems.push(m),
    )
    expect(result.source).toBe('bundled')
    expect(problems).toEqual(['Could not download rune data for the new patch.'])
  })
})
