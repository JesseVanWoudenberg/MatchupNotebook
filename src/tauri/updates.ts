import { getVersion } from '@tauri-apps/api/app'
import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { NoUpdateSource, type AvailableUpdate, type UpdateSource } from '@/data/updates'
import { isTauri } from './environment'

/** How long a check may take before it counts as "no answer". */
const CHECK_TIMEOUT_MS = 15_000

/**
 * Tauri's updater plugin: the endpoint and public key are in
 * tauri.conf.json, and every release is signed with the matching private
 * key. A download that fails the signature check is thrown away.
 */
class TauriUpdateSource implements UpdateSource {
  private found: Update | undefined

  currentVersion(): Promise<string> {
    return getVersion()
  }

  async check(): Promise<AvailableUpdate | undefined> {
    this.found = (await check({ timeout: CHECK_TIMEOUT_MS })) ?? undefined
    if (!this.found) return undefined
    return {
      version: this.found.version,
      ...(this.found.body && { notes: this.found.body }),
    }
  }

  async install(): Promise<void> {
    if (!this.found) throw new Error('Check for updates first.')
    await this.found.downloadAndInstall()
    await relaunch()
  }
}

export function createUpdateSource(): UpdateSource {
  return isTauri() ? new TauriUpdateSource() : new NoUpdateSource()
}
