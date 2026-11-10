<template>
  <nav
    data-tauri-drag-region
    class="flex h-12 items-center gap-4 border-b border-(--color-outline) bg-(--color-surface) pl-(--space-page) select-none"
    :class="controls ? 'pr-0' : 'pr-(--space-page)'"
  >
    <RouterLink
      to="/"
      class="flex items-center gap-2 font-semibold text-(--color-on-surface) hover:text-(--color-primary)"
    >
      <BaseIcon name="swords" />
      <span>Matchup notebook</span>
    </RouterLink>
    <div data-tauri-drag-region class="h-full flex-1" />
    <slot />
    <RouterLink
      to="/settings"
      class="rounded-md p-1.5 text-(--color-on-surface-muted) hover:bg-(--color-surface-raised) hover:text-(--color-on-surface)"
      title="Settings"
      aria-label="Settings"
    >
      <BaseIcon name="settings" />
    </RouterLink>

    <!-- Our own window buttons: the system bar is off (D-052). -->
    <div v-if="controls" class="ml-2 flex h-full items-stretch">
      <button
        type="button"
        class="flex w-11 items-center justify-center text-(--color-on-surface-muted) transition-colors hover:bg-(--color-surface-raised) hover:text-(--color-on-surface)"
        title="Minimise"
        aria-label="Minimise"
        @click="controls.minimize()"
      >
        <BaseIcon name="minus" :size="16" />
      </button>
      <button
        type="button"
        class="flex w-11 items-center justify-center text-(--color-on-surface-muted) transition-colors hover:bg-(--color-surface-raised) hover:text-(--color-on-surface)"
        :title="isMaximized ? 'Restore' : 'Maximise'"
        :aria-label="isMaximized ? 'Restore' : 'Maximise'"
        @click="controls.toggleMaximize()"
      >
        <BaseIcon :name="isMaximized ? 'copy' : 'square'" :size="14" />
      </button>
      <button
        type="button"
        class="flex w-11 items-center justify-center text-(--color-on-surface-muted) transition-colors hover:bg-(--color-danger) hover:text-(--color-on-primary)"
        title="Close"
        aria-label="Close"
        @click="controls.close()"
      >
        <BaseIcon name="x" :size="16" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { BaseIcon } from '@/components/base'
import type { Unlisten, WindowControls } from '@/tauri/window'

/**
 * The app's title bar: home link, whatever the page puts in the slot, the
 * settings link, and the window buttons. The bar itself drags the window;
 * a double click on it maximises, as the system bar did.
 */
const props = defineProps<{
  /** Undefined in a plain browser: no window buttons then. */
  controls?: WindowControls
}>()

const isMaximized = ref(false)
let stopListening: Unlisten | undefined

async function refreshMaximized(): Promise<void> {
  if (!props.controls) return
  isMaximized.value = await props.controls.isMaximized()
}

onMounted(async () => {
  if (!props.controls) return
  await refreshMaximized()
  stopListening = await props.controls.onResized(() => void refreshMaximized())
})

onUnmounted(() => stopListening?.())
</script>
