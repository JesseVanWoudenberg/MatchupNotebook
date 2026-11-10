/**
 * App updates, as the frontend sees them. The Tauri implementation lives
 * in src/tauri/updates.ts; the browser and tests get one that never finds
 * anything.
 */

export interface AvailableUpdate {
  version: string
  /** Release notes, when the release has them. */
  notes?: string
}

export interface UpdateSource {
  currentVersion(): Promise<string>
  /** Undefined when the app is up to date. Rejects when the check itself fails. */
  check(): Promise<AvailableUpdate | undefined>
  /** Downloads and installs the update found by the last `check`, then restarts the app. */
  install(): Promise<void>
}

export class NoUpdateSource implements UpdateSource {
  constructor(private readonly version = '0.0.0') {}
  async currentVersion(): Promise<string> {
    return this.version
  }
  async check(): Promise<AvailableUpdate | undefined> {
    return undefined
  }
  async install(): Promise<void> {}
}
