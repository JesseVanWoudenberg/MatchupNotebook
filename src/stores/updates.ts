import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AvailableUpdate, UpdateSource } from '@/data/updates'

/**
 * Whether a newer release exists. The app checks once at startup and on
 * request from Settings; installing is always a click away, never automatic.
 */
export const useUpdateStore = defineStore('updates', () => {
  const currentVersion = ref('')
  const available = ref<AvailableUpdate>()
  const isChecking = ref(false)
  const isInstalling = ref(false)
  /** Why the last check or install failed, in plain words. */
  const lastProblem = ref<string>()
  /** True once a check has answered, so Settings can say "up to date". */
  const hasChecked = ref(false)
  let source: UpdateSource | undefined

  async function initialize(updateSource: UpdateSource): Promise<void> {
    source = updateSource
    currentVersion.value = await updateSource.currentVersion()
  }

  function requireSource(): UpdateSource {
    if (!source) throw new Error('The update source is not set up yet.')
    return source
  }

  /** Never throws. Problems land in `lastProblem`. */
  async function check(): Promise<AvailableUpdate | undefined> {
    isChecking.value = true
    lastProblem.value = undefined
    try {
      available.value = await requireSource().check()
      hasChecked.value = true
    } catch (error: unknown) {
      lastProblem.value = 'Could not check for updates. Try again later.'
      console.warn('Update check failed', error)
    } finally {
      isChecking.value = false
    }
    return available.value
  }

  /** Downloads, installs and restarts. Rethrows so the caller can show it. */
  async function install(): Promise<void> {
    isInstalling.value = true
    lastProblem.value = undefined
    try {
      await requireSource().install()
    } catch (error: unknown) {
      lastProblem.value = 'The update could not be installed.'
      throw error
    } finally {
      isInstalling.value = false
    }
  }

  return {
    currentVersion,
    available,
    isChecking,
    isInstalling,
    lastProblem,
    hasChecked,
    initialize,
    check,
    install,
  }
})
