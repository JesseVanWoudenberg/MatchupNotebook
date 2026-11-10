import { FileNotebookStore, MemoryNotebookStore, type NotebookStore } from '@/persistence'
import { isTauri } from './environment'
import { TauriAppFs, defaultNotebookDirectory } from './appFs'

/**
 * The real file store inside Tauri, in the given folder or the default app
 * folder. A throwaway memory store anywhere else, so the frontend still boots
 * in a plain browser or a test.
 */
export async function createNotebookStore(directory?: string): Promise<NotebookStore> {
  if (!isTauri()) return new MemoryNotebookStore()
  const fs = new TauriAppFs()
  const target = directory ?? (await defaultNotebookDirectory())
  await fs.mkdir(target)
  return new FileNotebookStore(fs, target)
}
