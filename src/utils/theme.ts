import type { Theme } from '@/schema/settings'

const DARK_CLASS = 'dark'
const DARK_QUERY = '(prefers-color-scheme: dark)'

let stopFollowingSystem: (() => void) | undefined

/**
 * Applies a theme by toggling the `dark` class on <html>. "system" follows
 * the OS and keeps following it until the next call.
 */
export function applyTheme(theme: Theme): void {
  stopFollowingSystem?.()
  stopFollowingSystem = undefined

  if (theme !== 'system') {
    document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark')
    return
  }

  const media = window.matchMedia(DARK_QUERY)
  const follow = () => document.documentElement.classList.toggle(DARK_CLASS, media.matches)
  follow()
  media.addEventListener('change', follow)
  stopFollowingSystem = () => media.removeEventListener('change', follow)
}
