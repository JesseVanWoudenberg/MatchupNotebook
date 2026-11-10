import { open } from '@tauri-apps/plugin-dialog'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { isTauri } from './environment'

/** Native folder picker. Undefined when cancelled or outside Tauri. */
export async function pickDirectory(defaultPath?: string): Promise<string | undefined> {
  if (!isTauri()) return undefined
  const picked = await open({ directory: true, multiple: false, defaultPath })
  return typeof picked === 'string' ? picked : undefined
}

/** Opens the file manager with the given file or folder selected. */
export async function revealInFileManager(path: string): Promise<void> {
  if (!isTauri()) return
  await revealItemInDir(path)
}
