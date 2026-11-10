/**
 * The handful of file operations the persistence layer needs. The Tauri
 * implementation lives in src/tauri/. Tests use an in-memory fake. Paths are
 * plain strings joined with forward slashes, which Tauri accepts everywhere.
 */
export interface AppFs {
  exists(path: string): Promise<boolean>
  readText(path: string): Promise<string>
  writeText(path: string, text: string): Promise<void>
  writeBytes(path: string, bytes: Uint8Array): Promise<void>
  /** Must replace `to` when it already exists, like std::fs::rename does. */
  rename(from: string, to: string): Promise<void>
  copy(from: string, to: string): Promise<void>
  remove(path: string): Promise<void>
  /** Creates the folder and any missing parents. No error when it exists. */
  mkdir(path: string): Promise<void>
}

export function joinPath(directory: string, ...parts: string[]): string {
  return [directory.replace(/[\\/]+$/, ''), ...parts].join('/')
}
