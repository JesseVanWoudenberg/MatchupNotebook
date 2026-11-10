import { FileSettingsStore, MemorySettingsStore, type SettingsStore } from '@/persistence'
import { isTauri } from './environment'
import { TauriAppFs, defaultNotebookDirectory } from './appFs'

/** Settings always live in the default Roaming app folder, since they say where the notebook is. */
export async function createSettingsStore(): Promise<SettingsStore> {
  if (!isTauri()) return new MemorySettingsStore()
  return new FileSettingsStore(new TauriAppFs(), await defaultNotebookDirectory())
}
