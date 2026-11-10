import type { Ability, ChampionAbilities, RankValues } from '@/data/abilities'
import {
  curationKey,
  type AbilityCuration,
  type CrowdControlEntry,
  type ScalingKind,
} from '@/data/abilityCuration'

/** One ability as the panel shows it: Data Dragon's numbers with the curated marks on top. */
export interface DisplayAbility extends Ability {
  scaling?: ScalingKind
  note?: string
  isCooldownHidden: boolean
  crowdControlDurations: CrowdControlEntry[]
}

/**
 * Overrides replace fields one by one; the crowd control durations come
 * along for the kinds the ability ends up with.
 */
export function displayAbilities(
  champion: ChampionAbilities,
  curation: AbilityCuration,
): DisplayAbility[] {
  return champion.abilities.map((ability) => {
    const key = curationKey(champion.id, ability.slot)
    const override = curation.overrides.find(
      (entry) => curationKey(entry.champ, entry.slot) === key,
    )
    const crowdControl = override?.crowdControl ?? ability.crowdControl
    return {
      ...ability,
      cooldown: override?.cooldown ?? ability.cooldown,
      cost: override?.cost ?? ability.cost,
      costUnit: override?.costUnit ?? ability.costUnit,
      range: override?.range ?? ability.range,
      crowdControl,
      ...(override?.scaling !== undefined && { scaling: override.scaling }),
      ...(override?.note !== undefined && { note: override.note }),
      isCooldownHidden: override?.hideCooldown ?? false,
      crowdControlDurations: curation.crowdControl.filter(
        (entry) =>
          curationKey(entry.champ, entry.slot) === key && crowdControl.includes(entry.kind),
      ),
    }
  })
}

/**
 * Data Dragon's ranges are centre to centre and sometimes a placeholder:
 * 0 for self-cast abilities and 20000 or more for anything without a real
 * range. The numbers shown are base values, like the wiki's.
 */
export const GLOBAL_RANGE = 20000
export const RANK_SEPARATOR = ' / '

/** "15 / 13.75 / 12.5 / 11.25 / 10", or "6" when every rank is the same. */
export function formatRanks(values: RankValues): string {
  return values.map(String).join(RANK_SEPARATOR)
}

function isAllZero(values: RankValues): boolean {
  return values.every((value) => value === 0)
}

/** Undefined when there is no cooldown to show: none in the data, or hidden on purpose. */
export function cooldownText(
  ability: Pick<Ability, 'cooldown'> & Partial<Pick<DisplayAbility, 'isCooldownHidden'>>,
): string | undefined {
  if (ability.isCooldownHidden || isAllZero(ability.cooldown)) return undefined
  return formatRanks(ability.cooldown)
}

/** "60 / 70 / 80 / 90 / 100 mana"; undefined when the ability costs nothing. */
export function costText(ability: Pick<Ability, 'cost' | 'costUnit'>): string | undefined {
  if (ability.costUnit === '' || isAllZero(ability.cost)) return undefined
  return `${formatRanks(ability.cost)} ${ability.costUnit}`
}

/** A number, "global", or undefined for self-cast abilities. */
export function rangeText(ability: Pick<Ability, 'range'>): string | undefined {
  if (isAllZero(ability.range)) return undefined
  if (ability.range.some((value) => value >= GLOBAL_RANGE)) return 'global'
  return formatRanks(ability.range)
}
