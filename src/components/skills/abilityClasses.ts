import type { Ability } from '@/schema'

/** One tint per ability so grids and strips read at a glance. Colours come from the theme. */
export const ABILITY_CLASSES: Readonly<Record<Ability, string>> = {
  Q: 'bg-(--color-ability-q-soft) text-(--color-ability-q)',
  W: 'bg-(--color-ability-w-soft) text-(--color-ability-w)',
  E: 'bg-(--color-ability-e-soft) text-(--color-ability-e)',
  R: 'bg-(--color-ability-r-soft) text-(--color-ability-r)',
}
