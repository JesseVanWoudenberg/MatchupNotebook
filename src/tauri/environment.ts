/** True inside the Tauri window, false in a plain browser or in tests. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
