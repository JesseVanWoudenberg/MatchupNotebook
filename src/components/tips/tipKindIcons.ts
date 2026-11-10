import type { TipKind } from '@/schema'
import type { IconName } from '@/components/icons/icons'

/** One icon per tip kind. "general" has none on purpose: it is the default and needs no mark. */
export const KIND_ICONS: Readonly<Record<TipKind, IconName | undefined>> = {
  setup: 'sliders',
  early: 'sunrise',
  watch_out: 'alert-triangle',
  win_con: 'trophy',
  general: undefined,
}
