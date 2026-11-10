import { describe, expect, it } from 'vitest'
import { groupByEnemy, matchupsWithContent } from './matchups'
import { makeNotebook, makeRunePage, makeSkillOrder, makeTip } from '@/test/fixtures'

const nameOf = (id: string) => (id === 'MonkeyKing' ? 'Wukong' : id)

describe('groupByEnemy', () => {
  it('puts champ-wide items first, then enemies by display name', () => {
    const general = makeTip({
      id: '00000000-0000-4000-8000-000000000001',
      scope: { myChamp: 'Taliyah' },
    })
    const vsZed = makeTip({
      id: '00000000-0000-4000-8000-000000000002',
      scope: { myChamp: 'Taliyah', enemy: 'Zed' },
    })
    const vsWukong = makeTip({
      id: '00000000-0000-4000-8000-000000000003',
      scope: { myChamp: 'Taliyah', enemy: 'MonkeyKing' },
    })
    const anyVsZed = makeTip({
      id: '00000000-0000-4000-8000-000000000004',
      scope: { enemy: 'Zed' },
    })

    const groups = groupByEnemy([vsZed, general, vsWukong, anyVsZed], nameOf)
    expect(groups.map((group) => group.enemy)).toEqual([undefined, 'MonkeyKing', 'Zed'])
    expect(groups[2]!.items).toEqual([vsZed, anyVsZed])
  })
  it('has no general group when nothing is champ-wide', () => {
    const vsZed = makeTip({ scope: { myChamp: 'Taliyah', enemy: 'Zed' } })
    expect(groupByEnemy([vsZed], nameOf).map((group) => group.enemy)).toEqual(['Zed'])
  })
})

describe('matchupsWithContent', () => {
  it('counts tips, pages and orders per enemy for the champ only', () => {
    const notebook = makeNotebook({
      tips: [
        makeTip({
          id: '00000000-0000-4000-8000-000000000011',
          scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
        }),
        makeTip({
          id: '00000000-0000-4000-8000-000000000012',
          scope: { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' },
        }),
        makeTip({ id: '00000000-0000-4000-8000-000000000013', scope: { myChamp: 'Taliyah' } }),
        makeTip({ id: '00000000-0000-4000-8000-000000000014', scope: { enemy: 'Zed' } }),
        makeTip({
          id: '00000000-0000-4000-8000-000000000015',
          scope: { myChamp: 'Ahri', enemy: 'Zed' },
        }),
      ],
      runePages: [makeRunePage({ scope: { myChamp: 'Taliyah', enemy: 'Yasuo' } })],
      skillOrders: [makeSkillOrder({ scope: { myChamp: 'Taliyah', enemy: 'Ahri' } })],
    })
    expect(matchupsWithContent(notebook, 'Taliyah', nameOf)).toEqual([
      { enemy: 'Ahri', tips: 0, runePages: 0, skillOrders: 1, total: 1 },
      { enemy: 'Yasuo', tips: 2, runePages: 1, skillOrders: 0, total: 3 },
    ])
  })
})
