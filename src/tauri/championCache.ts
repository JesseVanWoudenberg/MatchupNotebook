import { fetch } from '@tauri-apps/plugin-http'
import { ChampionSnapshot } from '@/data/champions'
import type { ChampionCache, TextFetcher } from '@/data/dataDragon'
import { joinPath, type AppFs } from '@/persistence'
import { isTauri } from './environment'
import { TauriAppFs, cacheDirectory } from './appFs'

export const CHAMPION_CACHE_FILE_NAME = 'champions.json'

/** Downloaded champion snapshots in the Local app folder. */
export class FileChampionCache implements ChampionCache {
  constructor(
    private readonly fs: AppFs,
    readonly directory: string,
  ) {}

  get path(): string {
    return joinPath(this.directory, CHAMPION_CACHE_FILE_NAME)
  }

  async read(): Promise<ChampionSnapshot | undefined> {
    if (!(await this.fs.exists(this.path))) return undefined
    return ChampionSnapshot.parse(JSON.parse(await this.fs.readText(this.path)))
  }

  async write(snapshot: ChampionSnapshot): Promise<void> {
    await this.fs.mkdir(this.directory)
    await this.fs.writeText(this.path, `${JSON.stringify(snapshot)}\n`)
  }
}

/** A cache that remembers nothing, for the browser and tests. */
export class NoChampionCache implements ChampionCache {
  async read(): Promise<ChampionSnapshot | undefined> {
    return undefined
  }
  async write(): Promise<void> {}
}

export async function createChampionCache(): Promise<ChampionCache> {
  if (!isTauri()) return new NoChampionCache()
  return new FileChampionCache(new TauriAppFs(), await cacheDirectory())
}

/**
 * Text over HTTPS through Tauri's HTTP plugin, which sidesteps browser CORS
 * rules. In a plain browser the window's fetch is used instead.
 */
export const fetchText: TextFetcher = async (url) => {
  const doFetch = isTauri() ? fetch : window.fetch
  const response = await doFetch(url)
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response.text()
}
