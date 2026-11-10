<template>
  <RouterView v-if="isPopupWindow" />

  <div v-else class="flex h-full flex-col">
    <AppTopBar :controls="windowControls">
      <span v-if="championStore.currentPatch" class="text-xs text-(--color-on-surface-muted)">
        Patch {{ championStore.currentPatch }}
      </span>
      <ClientStatusDot />
    </AppTopBar>

    <!-- The gutter is always kept, so a page does not shift sideways when its scrollbar comes or goes. -->
    <main class="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
      <RouterView v-if="notebookStore.isLoaded" />

      <PageShell v-else-if="notebookStore.loadError" title="Your notebook could not be opened">
        <div
          class="flex flex-col gap-3 rounded-lg border border-(--color-danger) bg-(--color-danger-soft) p-4 text-sm"
        >
          <p class="flex items-center gap-2 font-medium">
            <BaseIcon name="alert-triangle" />
            Nothing was changed on disk.
          </p>
          <p class="selectable whitespace-pre-wrap">{{ notebookStore.loadError }}</p>
          <p class="text-(--color-on-surface-muted)">
            Fix or move the file, then restart the app. Backups sit next to it.
          </p>
        </div>
      </PageShell>

      <p v-else class="p-(--space-page) text-sm text-(--color-on-surface-muted)">
        Opening your notebook…
      </p>
    </main>

    <ToastList />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { BaseIcon } from '@/components/base'
import ClientStatusDot from '@/components/client/ClientStatusDot.vue'
import { AppTopBar, PageShell, ToastList } from '@/components/composite'
import { useChampionStore } from '@/stores/champions'
import { useNotebookStore } from '@/stores/notebook'
import { isPostGameWindow } from '@/tauri/leagueClient'
import { createWindowControls } from '@/tauri/window'

const championStore = useChampionStore()
const notebookStore = useNotebookStore()

// The post-game popup is this same app in a tiny window: no top bar, no notebook.
const isPopupWindow = isPostGameWindow()
// The main window draws its own title bar; the buttons need the window.
const windowControls = createWindowControls()
</script>
