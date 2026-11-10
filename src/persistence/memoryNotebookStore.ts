import type { Notebook } from '@/schema'
import { parseNotebookDocument, serializeNotebook } from './document'
import type { NotebookStore } from './notebookStore'

/**
 * Keeps the notebook as serialized text in memory. Used by tests and by
 * browser-only development. Round-tripping through text means the memory
 * store exercises the same parse and validate path as the file store.
 */
export class MemoryNotebookStore implements NotebookStore {
  private text: string | undefined

  constructor(initial?: Notebook | string) {
    if (typeof initial === 'string') this.text = initial
    else if (initial) this.text = serializeNotebook(initial)
  }

  async load(): Promise<Notebook | undefined> {
    if (this.text === undefined) return undefined
    return parseNotebookDocument(this.text)
  }

  async save(notebook: Notebook): Promise<void> {
    this.text = serializeNotebook(notebook)
  }

  /** What is "on disk" right now. For assertions. */
  peekText(): string | undefined {
    return this.text
  }
}
