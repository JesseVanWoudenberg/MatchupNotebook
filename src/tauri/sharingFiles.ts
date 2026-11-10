import { open, save } from '@tauri-apps/plugin-dialog'
import { TauriAppFs } from './appFs'
import { isTauri } from './environment'

const FILTERS = [{ name: 'Matchup notebook file', extensions: ['json'] }]
const DESKTOP_ONLY = 'Saving and opening files only works in the desktop app.'

/**
 * Native save dialog, then the file. The dialog plugin adds the picked path
 * to the file scope, so no folder has to be allowed ahead of time.
 * Undefined when the dialog was cancelled.
 */
export async function saveTextAs(defaultName: string, text: string): Promise<string | undefined> {
  if (!isTauri()) throw new Error(DESKTOP_ONLY)
  const path = await save({ defaultPath: defaultName, filters: FILTERS })
  if (!path) return undefined
  await new TauriAppFs().writeText(path, text)
  return path
}

export interface PickedText {
  path: string
  text: string
}

/** Native open dialog, then the file's text. Undefined when cancelled. */
export async function openTextFile(): Promise<PickedText | undefined> {
  if (!isTauri()) throw new Error(DESKTOP_ONLY)
  const picked = await open({ multiple: false, directory: false, filters: FILTERS })
  if (typeof picked !== 'string') return undefined
  return { path: picked, text: await new TauriAppFs().readText(picked) }
}
