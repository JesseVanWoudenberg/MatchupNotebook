<template>
  <div class="overflow-x-auto">
    <table class="border-separate border-spacing-1 text-center text-xs select-none">
      <thead>
        <tr>
          <th class="w-6" />
          <th
            v-for="level in MAX_LEVEL"
            :key="level"
            class="w-7 font-normal text-(--color-on-surface-muted)"
            :class="{ 'text-(--color-on-surface)': ULTIMATE_LEVELS.includes(level) }"
          >
            {{ level }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ability in ABILITIES" :key="ability">
          <th class="font-semibold" :class="ABILITY_CLASSES[ability].split(' ')[1]">
            {{ ability }}
          </th>
          <td v-for="level in MAX_LEVEL" :key="level">
            <button
              type="button"
              role="radio"
              :aria-checked="model[level - 1] === ability"
              :aria-label="`Level ${level}: ${ability}`"
              class="flex h-7 w-7 items-center justify-center rounded border transition-colors"
              :class="
                model[level - 1] === ability
                  ? [ABILITY_CLASSES[ability], 'border-transparent font-semibold']
                  : 'border-(--color-outline) text-transparent hover:border-(--color-outline-strong) hover:text-(--color-on-surface-muted)'
              "
              @click="set(level - 1, ability)"
            >
              {{ ability }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ABILITIES, MAX_LEVEL, type Ability } from '@/schema'
import { ULTIMATE_LEVELS } from '@/model/skillOrders'
import { ABILITY_CLASSES } from './abilityClasses'

/**
 * Four rows by eighteen levels. One ability per level, like the client's
 * level-up panel. Undefined means the level is still empty.
 */
const model = defineModel<(Ability | undefined)[]>({ required: true })

function set(index: number, ability: Ability): void {
  const next = [...model.value]
  next[index] = next[index] === ability ? undefined : ability
  model.value = next
}
</script>
