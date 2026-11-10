<template>
  <div
    role="radiogroup"
    aria-label="Lane"
    class="inline-flex overflow-hidden rounded-md border border-(--color-outline-strong) bg-(--color-surface)"
  >
    <button
      type="button"
      role="radio"
      :aria-checked="model === undefined"
      :class="[BUTTON_CLASSES, model === undefined ? ACTIVE_CLASSES : INACTIVE_CLASSES]"
      title="Any lane"
      @click="model = undefined"
    >
      Any
    </button>
    <button
      v-for="role in ROLES"
      :key="role"
      type="button"
      role="radio"
      :aria-checked="model === role"
      :aria-label="ROLE_LABELS[role]"
      :title="ROLE_LABELS[role]"
      :class="[BUTTON_CLASSES, model === role ? ACTIVE_CLASSES : INACTIVE_CLASSES]"
      @click="model = role"
    >
      <LaneIcon :role="role" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ROLES, type Role } from '@/schema'
import { ROLE_LABELS } from '@/model/labels'
import LaneIcon from './LaneIcon.vue'

/** Undefined means "any lane". */
const model = defineModel<Role | undefined>()

const BUTTON_CLASSES =
  'flex h-9 min-w-9 items-center justify-center px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-primary) not-first:border-l not-first:border-(--color-outline)'
const ACTIVE_CLASSES = 'bg-(--color-primary-soft) text-(--color-primary)'
const INACTIVE_CLASSES =
  'text-(--color-on-surface-muted) hover:bg-(--color-surface-raised) hover:text-(--color-on-surface)'
</script>
