import { SCHEMA_VERSION, readSchemaVersion, validateNotebook, type Notebook } from '@/schema'
import { CorruptNotebookError, UnsupportedSchemaVersionError } from './errors'
import { migrateNotebook } from './migrations'

const JSON_INDENT = 2

/**
 * Text on disk to a validated notebook. Also the entry point for imports,
 * since the export format is the storage format. Throws a PersistenceError
 * subclass on anything unexpected; never returns a half-valid notebook.
 */
export function parseNotebookDocument(text: string): Notebook {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error: unknown) {
    throw new CorruptNotebookError('It is not valid JSON.', { cause: error })
  }

  const fileVersion = readSchemaVersion(raw)
  if (fileVersion === undefined) {
    throw new CorruptNotebookError('It has no schemaVersion.')
  }
  if (fileVersion > SCHEMA_VERSION) {
    throw new UnsupportedSchemaVersionError(fileVersion, SCHEMA_VERSION)
  }

  const migrated = migrateNotebook(raw, fileVersion)
  const result = validateNotebook(migrated)
  if (!result.ok) {
    throw new CorruptNotebookError(result.error)
  }
  return result.notebook
}

/** Notebook to the text that goes on disk. Indented so the file stays human-readable. */
export function serializeNotebook(notebook: Notebook): string {
  return `${JSON.stringify(notebook, null, JSON_INDENT)}\n`
}
