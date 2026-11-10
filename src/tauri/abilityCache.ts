import { AbilitySnapshot } from '@/data/abilities'
import type { AbilityCache } from '@/data/abilityRefresh'
import { joinPath, type AppFs } from '@/persistence'
import { isTauri } from './environment'
import { TauriAppFs, cacheDirectory } from './appFs'

export const ABILITY_CACHE_FILE_NAME = 'abilities.json'

/** Downloaded ability snapshots in the Local app folder, next to the champion cache. */
export class FileAbilityCache implements AbilityCache {
  constructor(
    private readonly fs: AppFs,
    readonly directory: string,
  ) {}

  get path(): string {
    return joinPath(this.directory, ABILITY_CACHE_FILE_NAME)
  }

  async read(): Promise<AbilitySnapshot | undefined> {
    if (!(await this.fs.exists(this.path))) return undefined
    return AbilitySnapshot.parse(JSON.parse(await this.fs.readText(this.path)))
  }

  async write(snapshot: AbilitySnapshot): Promise<void> {
    await this.fs.mkdir(this.directory)
    await this.fs.writeText(this.path, `${JSON.stringify(snapshot)}\n`)
  }
}

export class NoAbilityCache implements AbilityCache {
  async read(): Promise<AbilitySnapshot | undefined> {
    return undefined
  }
  async write(): Promise<void> {}
}

export async function createAbilityCache(): Promise<AbilityCache> {
  if (!isTauri()) return new NoAbilityCache()
  return new FileAbilityCache(new TauriAppFs(), await cacheDirectory())
}
