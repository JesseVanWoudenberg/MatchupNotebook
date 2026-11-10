<template>
  <dialog
    ref="dialog"
    class="m-auto w-full rounded-lg border border-(--color-outline) bg-(--color-surface) p-0 text-(--color-on-surface) shadow-xl backdrop:bg-black/40"
    @close="open = false"
    :class="size === 'lg' ? 'max-w-2xl' : 'max-w-md'"
    @cancel.prevent="open = false"
  >
    <div v-if="open" class="flex flex-col gap-4 p-5">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <div class="text-sm text-(--color-on-surface-muted)"><slot /></div>
      <div class="flex justify-end gap-2"><slot name="actions" /></div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })

withDefaults(defineProps<{ title: string; size?: 'md' | 'lg' }>(), { size: 'md' })

const dialog = useTemplateRef<HTMLDialogElement>('dialog')

watch(open, (isOpen) => {
  const element = dialog.value
  if (!element) return
  if (isOpen && !element.open) element.showModal()
  if (!isOpen && element.open) element.close()
})
</script>
