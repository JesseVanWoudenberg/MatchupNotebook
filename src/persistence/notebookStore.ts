import type { Notebook } from '@/schema'

/**
 * Where the notebook lives. The file on disk is one implementation. A sync
 * store can slot in later without the rest of the app noticing. Pinia stores
 * are the only callers.
 */
export interface NotebookStore {
  /**
   * Returns undefined when nothing has been saved yet, so the caller can start
   * a fresh notebook. Throws a PersistenceError when something is stored but
   * cannot be read. In that case the caller must not save over it.
   */
  load(): Promise<Notebook | undefined>

  /** Persists the whole notebook. Throws a PersistenceError on failure. */
  save(notebook: Notebook): Promise<void>
}
