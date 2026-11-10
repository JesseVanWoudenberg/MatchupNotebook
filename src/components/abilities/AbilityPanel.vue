<template>
  <section v-if="blocks.length > 0" class="flex flex-col gap-5">
    <div class="flex flex-col gap-1">
      <div class="flex items-center text-xs text-(--color-on-surface-muted)">
        <span class="inline-flex items-center gap-1">
          <BaseIcon name="crosshair" :size="13" />
          Ranges you can space, to one scale
        </span>
        <span class="ml-auto" title="The patch these numbers come from">
          Patch {{ abilityStore.patch }}
        </span>
      </div>
      <AbilityRangeMap :sides="sides" />
    </div>

    <div v-for="(block, index) in blocks" :key="block.id" class="flex flex-col gap-1">
      <div class="flex items-center gap-2 text-sm">
        <ChampionIcon v-if="block.portrait" :champion="block.portrait" :size="24" />
        <span class="font-medium">{{ block.name }}</span>
        <span class="text-xs text-(--color-on-surface-muted)">{{ block.label }}</span>
      </div>

      <table class="w-full table-fixed text-sm">
        <colgroup>
          <col class="w-9" />
          <col class="w-[42%]" />
          <col />
          <col class="w-[24%]" />
        </colgroup>
        <thead v-if="index === 0">
          <tr class="text-xs text-(--color-on-surface-muted)">
            <th class="w-9 pb-1"></th>
            <th class="pb-1 text-left font-normal">Ability</th>
            <th class="pb-1 text-left font-normal">
              <span class="inline-flex items-center gap-1" title="Cooldown per rank, in seconds">
                <BaseIcon name="clock" :size="13" />
                Cooldown
              </span>
            </th>
            <th class="pb-1 text-left font-normal">
              <span class="inline-flex items-center gap-1" title="Cost per rank">
                <BaseIcon name="droplet" :size="13" />
                Cost
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in block.rows"
            :key="row.slot"
            class="border-t border-(--color-outline) align-middle"
          >
            <td class="py-2 pr-2">
              <span
                class="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold"
                :class="SLOT_CLASSES[row.slot]"
              >
                {{ row.slot }}
              </span>
            </td>
            <td class="py-2 pr-3">
              <div class="flex items-center gap-2">
                <img
                  v-if="!failedIcons.has(row.icon)"
                  :src="abilityStore.iconUrlOf(row.icon)"
                  alt=""
                  class="h-7 w-7 shrink-0 rounded"
                  loading="lazy"
                  @error="failedIcons.add(row.icon)"
                />
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span class="font-medium">{{ row.name }}</span>
                    <span
                      v-if="row.scaling"
                      class="inline-flex text-(--color-on-surface-muted)"
                      :title="SCALING_TITLES[row.scaling]"
                      :aria-label="SCALING_TITLES[row.scaling]"
                    >
                      <BaseIcon :name="SCALING_ICONS[row.scaling]" :size="14" />
                    </span>
                    <span v-if="row.note" class="text-xs text-(--color-on-surface-muted)">
                      {{ row.note }}
                    </span>
                  </div>
                  <div v-if="row.crowdControl.length > 0" class="mt-0.5 flex flex-wrap gap-1">
                    <span
                      v-for="mark in crowdControlMarks(row)"
                      :key="mark.kind"
                      class="inline-flex items-center gap-1 rounded-md bg-(--color-danger-soft) px-1.5 py-0.5 text-xs text-(--color-danger)"
                      :title="mark.title"
                    >
                      <BaseIcon name="ban" :size="12" />
                      {{ mark.label }}
                      <span
                        v-if="mark.seconds"
                        class="tabular-nums"
                        :class="{ 'opacity-60': !mark.isVerified }"
                      >
                        {{ mark.seconds }}s
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td class="py-2 pr-3 tabular-nums">
              <span v-if="cooldownText(row)">{{ cooldownText(row) }}</span>
              <span v-else class="text-(--color-on-surface-muted)">—</span>
              <span
                v-if="row.charges > 0"
                class="ml-1 text-xs text-(--color-on-surface-muted)"
                :title="`${row.charges} charges`"
              >
                ×{{ row.charges }}
              </span>
            </td>
            <td class="py-2 tabular-nums">
              <span
                v-if="costOf(row)"
                class="inline-flex items-center gap-1"
                :title="costOf(row)!.title"
              >
                <BaseIcon
                  v-if="costOf(row)!.icon"
                  :name="costOf(row)!.icon!"
                  :size="13"
                  class="text-(--color-on-surface-muted)"
                />
                {{ costOf(row)!.text }}
              </span>
              <span v-else class="text-(--color-on-surface-muted)">0</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-(--color-on-surface-muted)">
      Base values. No ability haste, items or runes.
    </p>
  </section>
  <p v-else class="text-sm text-(--color-on-surface-muted)">
    No ability data for this champion yet.
  </p>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { ChampId } from '@/schema'
import type { AbilitySlot, CrowdControlKind } from '@/data/abilities'
import type { ScalingKind } from '@/data/abilityCuration'
import type { Champion } from '@/data/champions'
import { BaseIcon } from '@/components/base'
import ChampionIcon from '@/components/champions/ChampionIcon.vue'
import type { IconName } from '@/components/icons/icons'
import { cooldownText, formatRanks, type DisplayAbility } from '@/model/abilityDisplay'
import { useAbilityStore } from '@/stores/abilities'
import { useChampionStore } from '@/stores/champions'
import AbilityRangeMap, { type RangeSide } from './AbilityRangeMap.vue'

/**
 * The range picture on top, then a table per champion with base cooldown,
 * cost and hard crowd control for Q, W, E and R. With `myChamp` set, your
 * own champion is the second side of the picture and the second table.
 * Serves the matchup page and the live view.
 */
const props = defineProps<{
  /** The champion whose numbers lead, normally the enemy. */
  champ: ChampId
  /** Your champion, for comparison. */
  myChamp?: ChampId
}>()

const abilityStore = useAbilityStore()
const championStore = useChampionStore()
/** Icons that failed to load, so the row shows no broken image offline. */
const failedIcons = reactive(new Set<string>())

interface Block {
  id: ChampId
  name: string
  label: string
  portrait: Champion | undefined
  rows: DisplayAbility[]
}

function blockFor(id: ChampId, label: string): Block | undefined {
  if (!abilityStore.forChampion(id)) return undefined
  return {
    id,
    name: championStore.nameOf(id),
    label,
    portrait: championStore.get(id),
    rows: abilityStore.rowsFor(id),
  }
}

const blocks = computed<Block[]>(() => {
  const enemy = blockFor(props.champ, props.myChamp ? 'Enemy' : '')
  const you =
    props.myChamp && props.myChamp !== props.champ ? blockFor(props.myChamp, 'You') : undefined
  return [enemy, you].filter((block): block is Block => block !== undefined)
})

/** Alone, a champion is drawn as yours: the matchup page shows your own numbers that way. */
const sides = computed<RangeSide[]>(() =>
  blocks.value.map((block, index) => ({
    id: block.id,
    name: block.name,
    portrait: block.portrait,
    rings: abilityStore.ringsFor(block.id),
    tone: blocks.value.length === 1 || index === 1 ? 'you' : 'enemy',
  })),
)

/** Full class strings so Tailwind sees them. */
const SLOT_CLASSES: Record<AbilitySlot, string> = {
  Q: 'bg-(--color-ability-q-soft) text-(--color-ability-q)',
  W: 'bg-(--color-ability-w-soft) text-(--color-ability-w)',
  E: 'bg-(--color-ability-e-soft) text-(--color-ability-e)',
  R: 'bg-(--color-ability-r-soft) text-(--color-ability-r)',
}

const SCALING_ICONS: Record<ScalingKind, IconName> = {
  attack_speed: 'gauge',
  resistances: 'shield',
  level: 'trending-up',
  stacks: 'layers',
}

const SCALING_TITLES: Record<ScalingKind, string> = {
  attack_speed: 'Cooldown scales with attack speed',
  resistances: 'Cooldown scales with bonus resistances',
  level: 'Cooldown scales with level',
  stacks: 'Cooldown scales with stacks',
}

/** Resources with an icon of their own; anything else prints its unit. */
const COST_ICONS: Readonly<Record<string, IconName>> = {
  mana: 'droplet',
  energy: 'zap',
  health: 'heart',
}

interface CostMark {
  text: string
  icon: IconName | undefined
  title: string
}

/** The numbers with a resource icon, or with the unit spelled out when there is no icon. */
function costOf(row: DisplayAbility): CostMark | undefined {
  if (row.costUnit === '' || row.cost.every((value) => value === 0)) return undefined
  const icon = COST_ICONS[row.costUnit]
  const numbers = formatRanks(row.cost)
  return {
    text: icon ? numbers : `${numbers} ${row.costUnit}`,
    icon,
    title: `${numbers} ${row.costUnit}`,
  }
}

const CROWD_CONTROL_LABELS: Record<CrowdControlKind, string> = {
  stun: 'stun',
  root: 'root',
  knockup: 'knock up',
  knockback: 'knock back',
  pull: 'pull',
  silence: 'silence',
  fear: 'fear',
  charm: 'charm',
  taunt: 'taunt',
  suppression: 'suppression',
  sleep: 'sleep',
  polymorph: 'polymorph',
  blind: 'blind',
}

interface CrowdControlMark {
  kind: CrowdControlKind
  label: string
  seconds?: string
  isVerified: boolean
  title: string
}

/** One badge per kind; the duration comes along when the curated file has it. */
function crowdControlMarks(row: DisplayAbility): CrowdControlMark[] {
  return row.crowdControl.map((kind) => {
    const duration = row.crowdControlDurations.find((entry) => entry.kind === kind)
    const label = CROWD_CONTROL_LABELS[kind]
    if (!duration) return { kind, label, isVerified: false, title: `${label}, duration unknown` }
    const seconds = formatRanks(duration.seconds)
    return {
      kind,
      label,
      seconds,
      isVerified: duration.verified,
      title: duration.verified
        ? `${label} for ${seconds} seconds`
        : `${label} for ${seconds} seconds, not yet verified`,
    }
  })
}
</script>
