<template>
  <PageShell title="Settings" back @back="router.back()">
    <section class="flex flex-col gap-3">
      <h2 class="font-medium">Appearance</h2>
      <div
        role="radiogroup"
        aria-label="Theme"
        class="inline-flex w-fit overflow-hidden rounded-md border border-(--color-outline-strong) bg-(--color-surface)"
      >
        <button
          v-for="option in THEMES"
          :key="option"
          type="button"
          role="radio"
          :aria-checked="settingsStore.theme === option"
          class="px-3 py-1.5 text-sm transition-colors not-first:border-l not-first:border-(--color-outline)"
          :class="
            settingsStore.theme === option
              ? 'bg-(--color-primary-soft) text-(--color-primary)'
              : 'text-(--color-on-surface-muted) hover:bg-(--color-surface-raised)'
          "
          @click="chooseTheme(option)"
        >
          {{ THEME_LABELS[option] }}
        </button>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="font-medium">Your notebook</h2>
      <p class="text-sm text-(--color-on-surface-muted)">
        Tips are saved in one file. Put it in a synced folder like OneDrive to keep it on every PC.
        Backups sit next to it.
      </p>
      <p
        class="selectable rounded-md border border-(--color-outline) bg-(--color-surface) px-3 py-2 font-mono text-xs"
      >
        {{ notebookPath }}
      </p>
      <div class="flex flex-wrap gap-2">
        <BaseButton variant="outlined" @click="revealNotebook">Open folder</BaseButton>
        <BaseButton variant="outlined" @click="changeFolder">Change folder</BaseButton>
        <BaseButton v-if="settingsStore.notebookDirectory" variant="text" @click="useDefaultFolder">
          Use the default folder
        </BaseButton>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="font-medium">Backup and sharing</h2>
      <p class="text-sm text-(--color-on-surface-muted)">
        A backup is your whole notebook in one file. Importing merges by id: new items are added,
        yours are never overwritten. Tips from others show their name.
      </p>
      <div class="flex flex-wrap gap-2">
        <BaseButton variant="outlined" :disabled="isExporting" @click="exportBackup">
          <BaseIcon name="download" :size="15" />
          Export a backup
        </BaseButton>
        <ImportButton />
      </div>
      <form class="flex flex-wrap items-end gap-2" @submit.prevent="saveAuthorName">
        <BaseTextField
          v-model="authorNameDraft"
          label="Your name on tips you share"
          placeholder="Shown to whoever imports them"
          class="w-72"
        />
        <BaseButton variant="outlined" type="submit" :disabled="!isAuthorNameChanged"
          >Save</BaseButton
        >
      </form>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="font-medium">Updates</h2>
      <p class="text-sm text-(--color-on-surface-muted)">{{ updateText }}</p>
      <p v-if="updateStore.available?.notes" class="selectable text-sm whitespace-pre-wrap">
        {{ updateStore.available.notes }}
      </p>
      <p v-if="updateStore.lastProblem" class="text-sm text-(--color-danger)">
        {{ updateStore.lastProblem }}
      </p>
      <div class="flex flex-wrap gap-2">
        <BaseButton
          v-if="updateStore.available"
          :disabled="updateStore.isInstalling"
          @click="installUpdate"
        >
          {{ updateStore.isInstalling ? 'Installing…' : 'Install and restart' }}
        </BaseButton>
        <BaseButton
          variant="outlined"
          :disabled="updateStore.isChecking || updateStore.isInstalling"
          @click="checkForUpdate"
        >
          {{ updateStore.isChecking ? 'Checking…' : 'Check for updates' }}
        </BaseButton>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="font-medium">Champion data</h2>
      <p class="text-sm text-(--color-on-surface-muted)">
        Patch {{ championStore.currentPatch }} from {{ SOURCE_LABELS[championStore.source] }}. The
        app checks Riot's Data Dragon for a newer patch at every start.
      </p>
      <p
        v-if="championStore.knownPatches.length > 0"
        class="text-sm text-(--color-on-surface-muted)"
      >
        Newest patch Riot lists: {{ championStore.knownPatches[0] }}.
      </p>
      <p v-if="championStore.lastProblem" class="text-sm text-(--color-danger)">
        {{ championStore.lastProblem }}
      </p>
      <div>
        <BaseButton
          variant="outlined"
          :disabled="championStore.isRefreshing"
          @click="checkForNewPatch"
        >
          {{ championStore.isRefreshing ? 'Checking…' : 'Check now' }}
        </BaseButton>
      </div>
    </section>
    <section v-if="AI_ADD_ON_AVAILABLE" class="flex flex-col gap-3">
      <h2 class="font-medium">AI</h2>
      <BaseToggle :model-value="settingsStore.ai.enabled" @update:model-value="toggleAi">
        <span>
          Let an AI suggest tip changes from a review. Off unless you turn it on. It only proposes;
          you approve each line.
        </span>
      </BaseToggle>
      <template v-if="settingsStore.ai.enabled">
        <p class="text-sm text-(--color-on-surface-muted)">
          What is sent: your review and the tips of that matchup. Nothing else leaves the app. The
          key is kept in Windows Credential Manager, never in a file.
        </p>
        <form class="flex flex-col gap-3" @submit.prevent="saveAiSettings">
          <div class="grid gap-3 sm:grid-cols-2">
            <BaseSelect v-model="aiProviderDraft" label="Provider" :options="providerOptions" />
            <BaseTextField v-model="aiModelDraft" label="Model" placeholder="claude-opus-5-5" />
            <BaseTextField
              v-if="aiProviderDraft === 'openai_compatible'"
              v-model="aiBaseUrlDraft"
              label="Server address"
              placeholder="http://localhost:11434/v1"
            />
          </div>
          <div>
            <BaseButton variant="outlined" type="submit" :disabled="!isAiSettingsChanged">
              Save
            </BaseButton>
          </div>
        </form>
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="saveAiKey">
          <BaseTextField
            v-model="aiKeyDraft"
            type="password"
            label="API key"
            :placeholder="aiStore.hasKey ? 'A key is stored' : 'Paste the key here'"
            class="w-80"
          />
          <BaseButton variant="outlined" type="submit" :disabled="aiKeyDraft.trim() === ''">
            Save key
          </BaseButton>
          <BaseButton v-if="aiStore.hasKey" variant="text" @click="removeAiKey"
            >Remove key</BaseButton
          >
        </form>
      </template>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="font-medium">League client</h2>
      <p class="flex items-center gap-1 text-sm text-(--color-on-surface-muted)">
        <ClientStatusDot />
        {{ clientStatusText }}
      </p>
      <BaseToggle
        :model-value="settingsStore.postGamePopup"
        @update:model-value="togglePostGamePopup"
      >
        Offer a review in a small popup when a game ends
      </BaseToggle>
      <BaseToggle :model-value="settingsStore.liveView" @update:model-value="toggleLiveView">
        Switch to the live view in champ select and in game
      </BaseToggle>
      <form class="flex flex-wrap items-end gap-2" @submit.prevent="saveHotkey">
        <BaseTextField
          v-model="hotkeyDraft"
          label="Champ select hotkey"
          :placeholder="DEFAULT_CHAMP_SELECT_HOTKEY"
          :error="hotkeyError"
          class="w-72"
        />
        <BaseButton variant="outlined" type="submit" :disabled="!isHotkeyChanged">Save</BaseButton>
      </form>
      <p class="text-sm text-(--color-on-surface-muted)">
        Brings this window up during champ select. Off at every other time, including in game.
      </p>
      <ClientSimulator v-if="isDevelopmentBuild" />
    </section>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AI_PROVIDERS,
  AiProvider,
  DEFAULT_CHAMP_SELECT_HOTKEY,
  THEMES,
  type Theme,
} from '@/schema/settings'
import { BaseButton, BaseIcon, BaseSelect, BaseTextField, BaseToggle } from '@/components/base'
import ClientSimulator from '@/components/client/ClientSimulator.vue'
import ClientStatusDot from '@/components/client/ClientStatusDot.vue'
import { PageShell } from '@/components/composite'
import ImportButton from '@/components/sharing/ImportButton.vue'
import { useToast } from '@/composables/useToast'
import { AI_ADD_ON_AVAILABLE, AI_PROVIDER_LABELS } from '@/data/ai'
import type { ChampionDataSource } from '@/data/dataDragon'
import { backupDocument, backupFileName } from '@/model/sharing'
import { NOTEBOOK_FILE_NAME, joinPath, serializeNotebook } from '@/persistence'
import { saveTextAs } from '@/tauri/sharingFiles'
import { useAiStore } from '@/stores/ai'
import { useChampionStore } from '@/stores/champions'
import { useClientStore } from '@/stores/client'
import { useNotebookStore } from '@/stores/notebook'
import { useSettingsStore } from '@/stores/settings'
import { useUpdateStore } from '@/stores/updates'
import { pickDirectory, revealInFileManager } from '@/tauri/dialogs'
import { createChampionCache, fetchText } from '@/tauri/championCache'
import { moveNotebookTo, resolvedNotebookDirectory } from '@/tauri/notebookLocation'

const router = useRouter()
const toast = useToast()
const settingsStore = useSettingsStore()
/** The client simulator exists only in `tauri dev`; a release build has no trace of it. */
const isDevelopmentBuild = import.meta.env.DEV
const championStore = useChampionStore()
const notebookStore = useNotebookStore()
const clientStore = useClientStore()
const aiStore = useAiStore()
const updateStore = useUpdateStore()

const updateText = computed(() => {
  const current = `You have version ${updateStore.currentVersion || '…'}.`
  if (updateStore.available) return `${current} Version ${updateStore.available.version} is ready.`
  if (updateStore.hasChecked) return `${current} It is the latest.`
  return `${current} The app checks for a newer one at every start.`
})

async function checkForUpdate(): Promise<void> {
  await updateStore.check()
}

async function installUpdate(): Promise<void> {
  try {
    await updateStore.install()
  } catch (error: unknown) {
    report(error, 'The update could not be installed.')
  }
}

const THEME_LABELS: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const SOURCE_LABELS: Record<ChampionDataSource, string> = {
  fresh: 'a fresh download',
  cache: 'the last download',
  bundled: 'the copy built into the app',
}

const notebookPath = computed(() =>
  joinPath(resolvedNotebookDirectory.value ?? '…', NOTEBOOK_FILE_NAME),
)

function report(error: unknown, fallback: string): void {
  toast.error(error instanceof Error ? error.message : fallback)
}

async function chooseTheme(theme: Theme): Promise<void> {
  try {
    await settingsStore.setTheme(theme)
  } catch (error: unknown) {
    report(error, 'Could not save the theme.')
  }
}

async function revealNotebook(): Promise<void> {
  try {
    await revealInFileManager(notebookPath.value)
  } catch (error: unknown) {
    report(error, 'Could not open the folder.')
  }
}

async function changeFolder(): Promise<void> {
  try {
    const picked = await pickDirectory(resolvedNotebookDirectory.value)
    if (!picked) return
    await moveNotebookTo(picked, settingsStore, notebookStore)
    toast.show('Your notebook now lives in the new folder. The old copy stays where it was.')
  } catch (error: unknown) {
    report(error, 'Could not change the folder.')
  }
}

async function useDefaultFolder(): Promise<void> {
  try {
    await moveNotebookTo(undefined, settingsStore, notebookStore)
    toast.show('Your notebook is back in the default folder.')
  } catch (error: unknown) {
    report(error, 'Could not change the folder.')
  }
}

const isExporting = ref(false)

async function exportBackup(): Promise<void> {
  const notebook = notebookStore.notebook
  if (!notebook) return
  isExporting.value = true
  try {
    const path = await saveTextAs(
      backupFileName(new Date().toISOString()),
      serializeNotebook(backupDocument(notebook)),
    )
    if (path) toast.show('Backup saved.')
  } catch (error: unknown) {
    report(error, 'Could not save the backup.')
  } finally {
    isExporting.value = false
  }
}

const authorNameDraft = ref(notebookStore.profile?.authorName ?? '')
const isAuthorNameChanged = computed(
  () => authorNameDraft.value.trim() !== (notebookStore.profile?.authorName ?? ''),
)

async function saveAuthorName(): Promise<void> {
  if (!isAuthorNameChanged.value) return
  try {
    await notebookStore.setAuthorName(authorNameDraft.value)
    authorNameDraft.value = notebookStore.profile?.authorName ?? ''
    toast.show('Name saved. It goes on tips you share from now on.')
  } catch (error: unknown) {
    report(error, 'Could not save your name.')
  }
}

async function checkForNewPatch(): Promise<void> {
  await championStore.refresh(await createChampionCache(), fetchText)
  if (!championStore.lastProblem)
    toast.show(`Champion data is on patch ${championStore.currentPatch}.`)
}

const providerOptions = AI_PROVIDERS.map((provider) => ({
  value: provider,
  label: AI_PROVIDER_LABELS[provider],
}))
const aiProviderDraft = ref<string>(settingsStore.ai.provider)
const aiModelDraft = ref(settingsStore.ai.model)
const aiBaseUrlDraft = ref(settingsStore.ai.baseUrl)
const aiKeyDraft = ref('')
const isAiSettingsChanged = computed(
  () =>
    aiProviderDraft.value !== settingsStore.ai.provider ||
    aiModelDraft.value.trim() !== settingsStore.ai.model ||
    aiBaseUrlDraft.value.trim() !== settingsStore.ai.baseUrl,
)

async function toggleAi(enabled: boolean): Promise<void> {
  try {
    await settingsStore.setAi({ enabled })
  } catch (error: unknown) {
    report(error, 'Could not save the setting.')
  }
}

async function saveAiSettings(): Promise<void> {
  try {
    await settingsStore.setAi({
      provider: AiProvider.parse(aiProviderDraft.value),
      model: aiModelDraft.value.trim(),
      baseUrl: aiBaseUrlDraft.value.trim(),
    })
    toast.show('AI settings saved.')
  } catch (error: unknown) {
    report(error, 'Could not save the AI settings.')
  }
}

async function saveAiKey(): Promise<void> {
  try {
    if (isAiSettingsChanged.value) await saveAiSettings()
    await aiStore.saveKey(aiKeyDraft.value)
    aiKeyDraft.value = ''
    toast.show('Key stored in Credential Manager.')
  } catch (error: unknown) {
    report(error, 'Could not store the key.')
  }
}

async function removeAiKey(): Promise<void> {
  try {
    await aiStore.removeKey()
    toast.show('Key removed.')
  } catch (error: unknown) {
    report(error, 'Could not remove the key.')
  }
}

const clientStatusText = computed(() =>
  clientStore.isConnected
    ? 'Connected. Champ select and the end of a game are picked up on their own.'
    : 'Not running. The dot turns green when the client is open; nothing else is needed.',
)

async function toggleLiveView(enabled: boolean): Promise<void> {
  try {
    await settingsStore.setLiveView(enabled)
  } catch (error: unknown) {
    report(error, 'Could not save the setting.')
  }
}

async function togglePostGamePopup(enabled: boolean): Promise<void> {
  try {
    await settingsStore.setPostGamePopup(enabled)
  } catch (error: unknown) {
    report(error, 'Could not save the setting.')
  }
}

const hotkeyDraft = ref(settingsStore.champSelectHotkey)
const hotkeyError = ref<string>()
const isHotkeyChanged = computed(
  () =>
    hotkeyDraft.value.trim() !== '' && hotkeyDraft.value.trim() !== settingsStore.champSelectHotkey,
)

/** The Rust side checks the shortcut text before it is kept. */
async function saveHotkey(): Promise<void> {
  const shortcut = hotkeyDraft.value.trim()
  if (!isHotkeyChanged.value) return
  try {
    await clientStore.applyHotkey(shortcut)
    hotkeyError.value = undefined
  } catch {
    hotkeyError.value = `Not a shortcut the app understands. Try ${DEFAULT_CHAMP_SELECT_HOTKEY}.`
    return
  }
  try {
    await settingsStore.setChampSelectHotkey(shortcut)
    toast.show('Hotkey saved. It works during champ select.')
  } catch (error: unknown) {
    report(error, 'Could not save the hotkey.')
  }
}
</script>
