import { appDataDir, appLocalDataDir } from '@tauri-apps/api/path'
import {
  copyFile,
  exists,
  mkdir,
  readTextFile,
  remove,
  rename,
  writeFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import type { AppFs } from '@/persistence'

/** The file operations the persistence layer needs, backed by Tauri's fs plugin. */
export class TauriAppFs implements AppFs {
  exists(path: string): Promise<boolean> {
    return exists(path)
  }

  readText(path: string): Promise<string> {
    return readTextFile(path)
  }

  writeText(path: string, text: string): Promise<void> {
    return writeTextFile(path, text)
  }

  writeBytes(path: string, bytes: Uint8Array): Promise<void> {
    return writeFile(path, bytes)
  }

  /** std::fs::rename underneath, which replaces an existing target on every platform. */
  rename(from: string, to: string): Promise<void> {
    return rename(from, to)
  }

  copy(from: string, to: string): Promise<void> {
    return copyFile(from, to)
  }

  remove(path: string): Promise<void> {
    return remove(path)
  }

  async mkdir(path: string): Promise<void> {
    if (!(await exists(path))) await mkdir(path, { recursive: true })
  }
}

function withoutTrailingSlash(path: string): string {
  return path.replace(/[\\/]+$/, '')
}

/** The Roaming app data folder (%APPDATA%\<identifier> on Windows). Never a hardcoded path. */
export async function defaultNotebookDirectory(): Promise<string> {
  return withoutTrailingSlash(await appDataDir())
}

/** The Local app data folder (%LOCALAPPDATA%\<identifier>), for caches. Kept apart from tips. */
export async function cacheDirectory(): Promise<string> {
  return withoutTrailingSlash(await appLocalDataDir())
}
