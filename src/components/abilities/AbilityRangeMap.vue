<template>
  <figure class="flex flex-col gap-1">
    <div class="relative mx-auto w-full max-w-xl">
      <div
        class="relative w-full overflow-hidden rounded-lg border border-(--color-outline) bg-(--color-surface)"
        :style="{ aspectRatio: `${layout.widthUnits} / ${layout.heightUnits}` }"
      >
        <template v-for="side in layout.sides" :key="`${side.id}-rings`">
          <div
            v-for="ring in side.rings"
            :key="ring.label"
            class="absolute aspect-square rounded-full border-2"
            :class="[ring.isAttack ? 'border-dashed' : 'border-solid', RING_CLASSES[side.tone]]"
            :style="{
              left: `${percentOfWidth(layout.widthUnits / 2 - ring.units)}%`,
              top: `${percentOfHeight(side.y - ring.units)}%`,
              width: `${percentOfWidth(ring.units * 2)}%`,
            }"
            :title="`${side.name}: ${ring.label}`"
          />
        </template>
        <!-- Labels after every ring, so no line is drawn across a number. -->
        <template v-for="side in layout.sides" :key="`${side.id}-labels`">
          <span
            v-for="ring in side.rings"
            :key="`${ring.label}-label`"
            class="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-(--color-surface) px-1 text-[11px] leading-4 whitespace-nowrap"
            :class="LABEL_CLASSES[side.tone]"
            :style="labelPlacements.get(labelKey(side, ring))"
          >
            {{ ring.label }}
          </span>
        </template>
      </div>
      <div
        v-for="side in layout.sides"
        :key="`${side.id}-portrait`"
        class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
        :style="{ top: `${percentOfHeight(side.y)}%` }"
        :title="side.name"
      >
        <ChampionIcon v-if="side.portrait" :champion="side.portrait" :size="40" />
      </div>
    </div>
    <figcaption class="text-center text-xs text-(--color-on-surface-muted)">
      {{ caption }}
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChampId } from '@/schema'
import type { Champion } from '@/data/champions'
import ChampionIcon from '@/components/champions/ChampionIcon.vue'
import type { RangeRing } from '@/model/rangeRings'

/**
 * The two champions facing each other like in lane: the enemy at the top,
 * you at the bottom, exactly the longest range apart, so the longest ring
 * just touches the other portrait and every shorter ring shows its margin.
 * Rings to one scale, clipped to the space between them. Pure CSS
 * percentages of the box.
 */
export type RangeTone = 'enemy' | 'you'

export interface RangeSide {
  id: ChampId
  name: string
  portrait: Champion | undefined
  rings: RangeRing[]
  /** Red for the enemy, blue for you. */
  tone: RangeTone
}

const props = defineProps<{
  /** The enemy first, you second. One side draws alone. */
  sides: RangeSide[]
}>()

/** Room past each portrait, as a share of the distance, so the icons sit inside the box. */
const EDGE_SHARE = 0.12
/** The box is this many reaches wide: wide enough to see the rings curve, no wider. */
const WIDTH_IN_REACHES = 1.6
/**
 * Spots a label may take on its arc, in degrees off the line between the
 * champions, tried in this order: near the line first, sideways when the
 * near spots are taken, the line itself as the last resort.
 */
const LABEL_CANDIDATE_DEGREES = [12, 30, 48, 66, 82, 0]
/** The box is capped at max-w-xl; label sizes in units follow from this width. */
const ASSUMED_BOX_PX = 560
const LABEL_HEIGHT_PX = 16
const LABEL_CHAR_PX = 6.2
const LABEL_PADDING_PX = 10
const PORTRAIT_PX = 40

interface PlacedSide extends RangeSide {
  /** Where the portrait sits, in units from the top of the box. */
  y: number
  /** Which way its rings matter: the enemy's reach down, yours up. */
  facing: 'down' | 'up'
}

const layout = computed(() => {
  const reach = Math.max(1, ...props.sides.flatMap((side) => side.rings.map((ring) => ring.units)))
  const edge = reach * EDGE_SHARE
  const widthUnits = reach * WIDTH_IN_REACHES
  if (props.sides.length < 2) {
    // One champion: its rings reach up from the bottom.
    const only = props.sides[0]
    const sides: PlacedSide[] = only ? [{ ...only, y: reach + edge, facing: 'up' }] : []
    return { reach, widthUnits, heightUnits: reach + 2 * edge, sides }
  }
  const sides: PlacedSide[] = props.sides.map((side, index) => ({
    ...side,
    y: index === 0 ? edge : edge + reach,
    facing: index === 0 ? 'down' : 'up',
  }))
  return { reach, widthUnits, heightUnits: reach + 2 * edge, sides }
})

const caption = computed(() => {
  const [enemy, you] = props.sides
  if (!enemy || !you) return 'Ranges to one scale.'
  return `${layout.value.reach} units apart: the longest ring just reaches the other champion. Red is ${enemy.name}, blue is ${you.name}.`
})

function percentOfWidth(units: number): number {
  return (units / layout.value.widthUnits) * 100
}

function percentOfHeight(units: number): number {
  return (units / layout.value.heightUnits) * 100
}

/** A label's box in units: its centre and size. */
interface LabelBox {
  x: number
  y: number
  width: number
  height: number
}

function overlapArea(a: LabelBox, b: LabelBox): number {
  const horizontal =
    Math.min(a.x + a.width / 2, b.x + b.width / 2) - Math.max(a.x - a.width / 2, b.x - b.width / 2)
  const vertical =
    Math.min(a.y + a.height / 2, b.y + b.height / 2) -
    Math.max(a.y - a.height / 2, b.y - b.height / 2)
  return horizontal > 0 && vertical > 0 ? horizontal * vertical : 0
}

function labelKey(side: PlacedSide, ring: RangeRing): string {
  return `${side.id}:${ring.label}`
}

/**
 * Each label sits on its own arc, the enemy's to the left of the line
 * between the champions and yours to the right. Spots are tried from the
 * line outwards and the first one that overlaps nothing wins: not another
 * label, not a portrait, not the box's edge. When every spot overlaps
 * something, the least bad one is taken.
 */
const labelPlacements = computed(() => {
  const { widthUnits, heightUnits, sides } = layout.value
  const unitsPerPx = widthUnits / ASSUMED_BOX_PX
  const height = LABEL_HEIGHT_PX * unitsPerPx
  const portrait = PORTRAIT_PX * unitsPerPx
  const taken: LabelBox[] = sides.map((side) => ({
    x: widthUnits / 2,
    y: side.y,
    width: portrait,
    height: portrait,
  }))
  const placements = new Map<string, Record<string, string>>()
  for (const side of sides) {
    const sideways = side.tone === 'enemy' ? -1 : 1
    const forward = side.facing === 'down' ? 1 : -1
    for (const ring of side.rings) {
      const width = (ring.label.length * LABEL_CHAR_PX + LABEL_PADDING_PX) * unitsPerPx
      let best: LabelBox | undefined
      let bestOverlap = Number.POSITIVE_INFINITY
      for (const degrees of LABEL_CANDIDATE_DEGREES) {
        const angle = (degrees * Math.PI) / 180
        const onArcX = widthUnits / 2 + sideways * ring.units * Math.sin(angle)
        const onArcY = side.y + forward * ring.units * Math.cos(angle)
        // Pulled back inside the box when the arc leaves it.
        const box: LabelBox = {
          x: Math.min(Math.max(onArcX, width / 2), widthUnits - width / 2),
          y: Math.min(Math.max(onArcY, height / 2), heightUnits - height / 2),
          width,
          height,
        }
        const overlap = taken.reduce((sum, other) => sum + overlapArea(box, other), 0)
        if (overlap < bestOverlap) {
          bestOverlap = overlap
          best = box
        }
        if (overlap === 0) break
      }
      if (!best) continue
      taken.push(best)
      placements.set(labelKey(side, ring), {
        left: `${percentOfWidth(best.x)}%`,
        top: `${percentOfHeight(best.y)}%`,
      })
    }
  }
  return placements
})

/**
 * One colour per side, not per ability: the rings overlap, and "whose is
 * this" matters more than "which key". The letter in the label says the rest.
 * Full class strings so Tailwind sees them.
 */
const RING_CLASSES: Record<RangeTone, string> = {
  enemy: 'border-(--color-danger)',
  you: 'border-(--color-primary)',
}
const LABEL_CLASSES: Record<RangeTone, string> = {
  enemy: 'text-(--color-danger)',
  you: 'text-(--color-primary)',
}
</script>
