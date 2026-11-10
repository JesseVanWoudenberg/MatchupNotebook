/**
 * Dev helper: regenerates the bundled Data Dragon snapshots from the newest
 * version Riot publishes, so a release ships current offline data.
 *
 *   npm run snapshots              # abilities only
 *   npm run snapshots -- --all     # champions, runes and abilities
 *
 * Pass --from <folder> to read championFull.json (and champion.json,
 * runesReforged.json) from a folder instead of downloading them.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseChampionFull } from '../src/data/abilities.ts'
import {
  VERSIONS_URL,
  championFullUrl,
  championListUrl,
  parseChampionList,
  parseVersions,
} from '../src/data/dataDragon.ts'
import { parseRunesReforged, runesUrl } from '../src/data/runes.ts'

const BUNDLED_DIR = join(import.meta.dirname, '..', 'src', 'data', 'bundled')
const args = process.argv.slice(2)
const buildAll = args.includes('--all')
const fromIndex = args.indexOf('--from')
const localFolder = fromIndex >= 0 ? args[fromIndex + 1] : undefined

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response.text()
}

/** The local copy when --from names one and the file is there, else the download. */
async function source(url: string, fileName: string): Promise<string> {
  if (localFolder) {
    const path = join(localFolder, fileName)
    if (existsSync(path)) return readFileSync(path, 'utf8')
  }
  return fetchText(url)
}

function write(fileName: string, value: unknown): void {
  const path = join(BUNDLED_DIR, fileName)
  writeFileSync(path, `${JSON.stringify(value)}\n`)
  console.log(`wrote ${path}`)
}

async function main(): Promise<void> {
  const versions = parseVersions(await fetchText(VERSIONS_URL))
  const version = versions[0]
  if (!version) throw new Error('Data Dragon lists no versions.')
  console.log(`Data Dragon ${version}`)

  const abilities = parseChampionFull(await source(championFullUrl(version), 'championFull.json'))
  write('abilities.json', abilities)
  console.log(`${abilities.champions.length} champions with abilities`)

  if (!buildAll) return
  const champions = parseChampionList(
    await source(championListUrl(version), 'champion.json'),
    versions,
  )
  write('champions.json', { version: champions.version, champions: champions.champions })
  const runes = parseRunesReforged(await source(runesUrl(version), 'runesReforged.json'), version)
  write('runes.json', runes)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
