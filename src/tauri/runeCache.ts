import { RuneSnapshot } from '@/data/runes'
import type { RuneCache } from '@/data/runeRefresh'
import { joinPath, type AppFs } from '@/persistence'
import { isTauri } from './environment'
import { TauriAppFs, cacheDirectory } from './appFs'

export const RUNE_CACHE_FILE_NAME = 'runes.json'

/** Downloaded rune snapshots in the Local app folder, next to the champion cache. */
export class FileRuneCache implements RuneCache {
  constructor(
    private readonly fs: AppFs,
    readonly directory: string,
  ) {}

  get path(): string {
    return joinPath(this.directory, RUNE_CACHE_FILE_NAME)
  }

  async read(): Promise<RuneSnapshot | undefined> {
    if (!(await this.fs.exists(this.path))) return undefined
    return RuneSnapshot.parse(JSON.parse(await this.fs.readText(this.path)))
  }

  async write(snapshot: RuneSnapshot): Promise<void> {
    await this.fs.mkdir(this.directory)
    await this.fs.writeText(this.path, `${JSON.stringify(snapshot)}\n`)
  }
}

export class NoRuneCache implements RuneCache {
  async read(): Promise<RuneSnapshot | undefined> {
    return undefined
  }
  async write(): Promise<void> {}
}

export async function createRuneCache(): Promise<RuneCache> {
  if (!isTauri()) return new NoRuneCache()
  return new FileRuneCache(new TauriAppFs(), await cacheDirectory())
}
