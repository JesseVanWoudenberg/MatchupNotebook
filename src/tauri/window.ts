import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauri } from './environment'

export type Unlisten = () => void

/**
 * What the app's own title bar needs from the window, now that Windows'
 * bar is off. Undefined in a plain browser, where the bar shows no buttons.
 */
export interface WindowControls {
  minimize(): Promise<void>
  toggleMaximize(): Promise<void>
  close(): Promise<void>
  isMaximized(): Promise<boolean>
  /** Fires after every resize; the bar asks `isMaximized` again. */
  onResized(handler: () => void): Promise<Unlisten>
}

export function createWindowControls(): WindowControls | undefined {
  if (!isTauri()) return undefined
  const current = getCurrentWindow()
  return {
    minimize: () => current.minimize(),
    toggleMaximize: () => current.toggleMaximize(),
    close: () => current.close(),
    isMaximized: () => current.isMaximized(),
    onResized: (handler) => current.onResized(handler),
  }
}
