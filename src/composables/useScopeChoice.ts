import { computed, ref, type Ref } from 'vue'
import type { MatchupScope } from '@/schema'
import type { SelectOption } from '@/components/base'
import { describeScope, type ChampionNamer } from '@/model/labels'

export type MatchupScopeChoice = 'matchup' | 'myChamp'

/**
 * The "applies to" choice shared by editors of champion-anchored items
 * (rune pages, skill orders): this matchup or your champ in general, plus
 * "only in this lane" when the page has a lane selected.
 */
export function useScopeChoice(
  view: Ref<MatchupScope>,
  existing: MatchupScope | undefined,
  nameOf: ChampionNamer,
) {
  const choice = ref<MatchupScopeChoice>(
    existing
      ? existing.enemy !== undefined
        ? 'matchup'
        : 'myChamp'
      : view.value.enemy
        ? 'matchup'
        : 'myChamp',
  )
  const roleSpecific = ref(existing ? existing.role !== undefined : false)

  const options = computed<SelectOption[]>(() => {
    const result: SelectOption[] = []
    const { myChamp, enemy } = view.value
    if (enemy) result.push({ value: 'matchup', label: describeScope({ myChamp, enemy }, nameOf) })
    result.push({ value: 'myChamp', label: describeScope({ myChamp }, nameOf) })
    return result
  })

  function buildScope(): MatchupScope {
    const scope: MatchupScope = { myChamp: view.value.myChamp }
    if (choice.value === 'matchup' && view.value.enemy) scope.enemy = view.value.enemy
    if (roleSpecific.value && view.value.role) scope.role = view.value.role
    return scope
  }

  return { choice, roleSpecific, options, buildScope }
}
