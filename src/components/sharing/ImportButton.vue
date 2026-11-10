<template>
  <BaseButton variant="outlined" :disabled="isBusy" @click="pickFile">
    <BaseIcon name="upload" :size="15" />
    Import a file
  </BaseButton>

  <BaseDialog v-model:open="isConfirming" :title="title">
    <div v-if="plan" class="flex flex-col gap-2">
      <p v-if="changeCount === 0">Everything in this file is already in your notebook.</p>
      <template v-else>
        <p v-for="line in lines" :key="line">{{ line }}</p>
        <p v-if="skippedCount > 0">
          {{ skippedCount }} already in your notebook, left as they are.
        </p>
      </template>
    </div>
    <template #actions>
      <BaseButton variant="text" @click="isConfirming = false">Cancel</BaseButton>
      <BaseButton :disabled="changeCount === 0 || isBusy" @click="confirm">Import</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BaseButton, BaseDialog, BaseIcon } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { importChangeCount, type ImportCounts, type ImportPlan } from '@/model/sharing'
import { PersistenceError, parseNotebookDocument } from '@/persistence'
import { useNotebookStore } from '@/stores/notebook'
import { openTextFile } from '@/tauri/sharingFiles'

/**
 * Import a notebook file: pick, parse, show what would change, then merge.
 * Nothing is written until "Import" is clicked.
 */
const toast = useToast()
const notebookStore = useNotebookStore()

const isBusy = ref(false)
const isConfirming = ref(false)
const plan = ref<ImportPlan>()

const title = computed(() => {
  if (!plan.value) return 'Import'
  if (plan.value.isOwnBackup) return 'Import your backup?'
  const author = plan.value.authorName.trim()
  return author ? `Import tips from ${author}?` : 'Import tips from this file?'
})

const changeCount = computed(() => (plan.value ? importChangeCount(plan.value) : 0))

const skippedCount = computed(() => {
  if (!plan.value) return 0
  const { tips, runePages, skillOrders, reviews } = plan.value
  return [tips, runePages, skillOrders, reviews].reduce((sum, c) => sum + c.skipped, 0)
})

const lines = computed(() => {
  if (!plan.value) return []
  const { tips, runePages, skillOrders, reviews, favoriteChamps } = plan.value
  return [
    describe(tips, 'tip', 'tips'),
    describe(runePages, 'rune page', 'rune pages'),
    describe(skillOrders, 'skill order', 'skill orders'),
    describe(reviews, 'review', 'reviews'),
    favoriteChamps > 0 ? `${favoriteChamps} added to your champs.` : '',
  ].filter((line) => line !== '')
})

function describe(counts: ImportCounts, one: string, many: string): string {
  const parts: string[] = []
  if (counts.added > 0) parts.push(`${counts.added} new`)
  if (counts.updated > 0) parts.push(`${counts.updated} updated`)
  if (parts.length === 0) return ''
  const total = counts.added + counts.updated
  return `${parts.join(', ')} ${total === 1 ? one : many}.`
}

async function pickFile(): Promise<void> {
  isBusy.value = true
  try {
    const picked = await openTextFile()
    if (!picked) return
    const incoming = parseNotebookDocument(picked.text)
    plan.value = notebookStore.planImport(incoming)
    isConfirming.value = true
  } catch (error: unknown) {
    toast.error(
      error instanceof PersistenceError
        ? error.message
        : 'Could not read that file. It needs to be a file this app saved.',
    )
  } finally {
    isBusy.value = false
  }
}

async function confirm(): Promise<void> {
  const current = plan.value
  if (!current) return
  isBusy.value = true
  try {
    await notebookStore.applyImport(current)
    isConfirming.value = false
    toast.show('Imported. Tips from others carry their name.')
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Could not import the file.')
  } finally {
    isBusy.value = false
  }
}
</script>
