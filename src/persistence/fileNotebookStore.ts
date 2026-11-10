import type { Notebook } from '@/schema'
import { joinPath, type AppFs } from './appFs'
import { parseNotebookDocument, serializeNotebook } from './document'
import type { NotebookStore } from './notebookStore'

export const NOTEBOOK_FILE_NAME = 'notebook.json'
export const NOTEBOOK_TEMP_FILE_NAME = 'notebook.json.tmp'
/** How many previous versions of the file are kept next to it. */
export const DEFAULT_BACKUP_COUNT = 5

export interface FileNotebookStoreOptions {
  backupCount?: number
}

/**
 * The notebook as a JSON file in a directory, with rolling backups.
 *
 * Save order: rotate backups, copy the current file to backup 1, write the
 * new content to a temp file, rename the temp file over the real one. A crash
 * at any point leaves either the old file or the new file in place, never a
 * half-written one.
 */
export class FileNotebookStore implements NotebookStore {
  private readonly backupCount: number

  constructor(
    private readonly fs: AppFs,
    readonly directory: string,
    options: FileNotebookStoreOptions = {},
  ) {
    this.backupCount = options.backupCount ?? DEFAULT_BACKUP_COUNT
  }

  get path(): string {
    return joinPath(this.directory, NOTEBOOK_FILE_NAME)
  }

  private get tempPath(): string {
    return joinPath(this.directory, NOTEBOOK_TEMP_FILE_NAME)
  }

  /** Backup 1 is the most recent. */
  backupPath(index: number): string {
    return joinPath(this.directory, `notebook.backup-${index}.json`)
  }

  async load(): Promise<Notebook | undefined> {
    if (!(await this.fs.exists(this.path))) return undefined
    return parseNotebookDocument(await this.fs.readText(this.path))
  }

  async save(notebook: Notebook): Promise<void> {
    const text = serializeNotebook(notebook)
    await this.fs.mkdir(this.directory)
    await this.rotateBackups()
    await this.fs.writeText(this.tempPath, text)
    await this.fs.rename(this.tempPath, this.path)
  }

  /** Paths of the backups that exist, most recent first. */
  async listBackups(): Promise<string[]> {
    const found: string[] = []
    for (let index = 1; index <= this.backupCount; index++) {
      const path = this.backupPath(index)
      if (await this.fs.exists(path)) found.push(path)
    }
    return found
  }

  private async rotateBackups(): Promise<void> {
    if (this.backupCount === 0) return
    if (!(await this.fs.exists(this.path))) return

    const oldest = this.backupPath(this.backupCount)
    if (await this.fs.exists(oldest)) await this.fs.remove(oldest)

    for (let index = this.backupCount - 1; index >= 1; index--) {
      const from = this.backupPath(index)
      if (await this.fs.exists(from)) await this.fs.rename(from, this.backupPath(index + 1))
    }

    await this.fs.copy(this.path, this.backupPath(1))
  }
}
