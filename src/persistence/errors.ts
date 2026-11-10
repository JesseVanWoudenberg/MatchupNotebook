/** Base class for anything that goes wrong reading or writing the notebook file. */
export class PersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PersistenceError'
  }
}

/** The file exists but cannot be understood. The app must never overwrite it. */
export class CorruptNotebookError extends PersistenceError {
  constructor(detail: string, options?: ErrorOptions) {
    super(`The notebook file could not be read. ${detail}`, options)
    this.name = 'CorruptNotebookError'
  }
}

/** The file was written by a newer app. Older code must not touch it. */
export class UnsupportedSchemaVersionError extends PersistenceError {
  constructor(
    readonly fileVersion: number,
    readonly appVersion: number,
  ) {
    super(
      `This notebook was saved by a newer version of the app (schema ${fileVersion}, ` +
        `this app reads up to ${appVersion}). Update the app to open it.`,
    )
    this.name = 'UnsupportedSchemaVersionError'
  }
}
