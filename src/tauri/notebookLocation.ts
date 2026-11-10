import { ref } from 'vue'
import { NOTEBOOK_FILE_NAME, joinPath, serializeNotebook } from '@/persistence'
import type { useNotebookStore } from '@/stores/notebook'
import type { useSettingsStore } from '@/stores/settings'
import { TauriAppFs, defaultNotebookDirectory } from './appFs'
import { createNotebookStore } from './createNotebookStore'
import { isTauri } from './environment'

/** The folder the notebook is currently read from. Set by bootstrap and by moves. */
export const resolvedNotebookDirectory = ref<string>()

/** Opens the notebook from the folder in settings, or the default folder. */
export async function openNotebookFromSettings(
  settings: ReturnType<typeof useSettingsStore>,
  notebook: ReturnType<typeof useNotebookStore>,
): Promise<void> {
  const directory =
    settings.notebookDirectory ?? (isTauri() ? await defaultNotebookDirectory() : undefined)
  resolvedNotebookDirectory.value = directory
  await notebook.initialize(await createNotebookStore(directory))
}

/**
 * Points the app at another folder. When that folder has no notebook yet,
 * the current one is copied there first so nothing is lost. The old file is
 * left in place. `undefined` returns to the default app folder.
 */
export async function moveNotebookTo(
  directory: string | undefined,
  settings: ReturnType<typeof useSettingsStore>,
  notebook: ReturnType<typeof useNotebookStore>,
): Promise<void> {
  if (!isTauri()) throw new Error('Changing the folder only works in the desktop app.')
  const target = directory ?? (await defaultNotebookDirectory())
  const fs = new TauriAppFs()
  const targetPath = joinPath(target, NOTEBOOK_FILE_NAME)

  if (notebook.notebook && !(await fs.exists(targetPath))) {
    await fs.mkdir(target)
    await fs.writeText(targetPath, serializeNotebook(notebook.notebook))
  }

  await settings.setNotebookDirectory(directory)
  await openNotebookFromSettings(settings, notebook)
}
