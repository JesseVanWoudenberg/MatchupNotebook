// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AbilityPanel from './AbilityPanel.vue'
import { useAbilityStore } from '@/stores/abilities'
import { useChampionStore } from '@/stores/champions'

describe('AbilityPanel', () => {
  beforeEach(() => {
    const pinia = setActivePinia(createPinia())
    useChampionStore(pinia).initialize()
  })

  it('shows the four abilities with base cooldown and cost', () => {
    const wrapper = mount(AbilityPanel, { props: { champ: 'Leblanc' } })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(4)
    const distortion = rows[1]!.text()
    expect(distortion).toContain('Distortion')
    expect(distortion).toContain('15 / 13.75 / 12.5 / 11.25 / 10')
    expect(distortion).toContain('60 / 70 / 80 / 90 / 100')
    expect(rows[1]!.find('[title="60 / 70 / 80 / 90 / 100 mana"]').exists()).toBe(true)
    expect(rows[3]!.text()).toContain('0')
    expect(wrapper.text()).toContain(`Patch ${useAbilityStore().patch}`)
  })

  it('draws the ranges as rings, attack included, globals left out', () => {
    const wrapper = mount(AbilityPanel, { props: { champ: 'Leblanc' } })
    const text = wrapper.find('figure').text()
    expect(text).toContain('Attack 525')
    expect(text).toContain('E 925')
    expect(text).not.toContain('R ')
    expect(wrapper.findAll('figure .rounded-full')).toHaveLength(4)
  })

  it('marks hard crowd control', () => {
    const wrapper = mount(AbilityPanel, { props: { champ: 'Morgana' } })
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]!.text()).toContain('root')
    expect(rows[3]!.text()).toContain('stun')
  })

  it('shows the curated scaling mark and crowd control correction', () => {
    const yone = mount(AbilityPanel, { props: { champ: 'Yone' } })
    expect(yone.find('[aria-label="Cooldown scales with attack speed"]').exists()).toBe(true)
    const taliyah = mount(AbilityPanel, { props: { champ: 'Taliyah' } })
    const volley = taliyah.findAll('tbody tr')[0]!
    expect(volley.findAll('[title^="stun"]')).toHaveLength(0)
    expect(volley.text()).toContain('stuns monsters only')
  })

  it('adds your own champion as the second side and table', () => {
    const wrapper = mount(AbilityPanel, { props: { champ: 'Akshan', myChamp: 'Taliyah' } })
    expect(wrapper.findAll('table')).toHaveLength(2)
    expect(wrapper.text()).toContain('Enemy')
    expect(wrapper.text()).toContain('You')
    const figure = wrapper.find('figure').text()
    expect(figure).toContain('Attack 525')
    // Taliyah Q at 1000 is the longest reach, so that is the distance.
    expect(figure).toContain('1000 units apart')
    const alone = mount(AbilityPanel, { props: { champ: 'Akshan', myChamp: 'Akshan' } })
    expect(alone.findAll('table')).toHaveLength(1)
    expect(alone.find('figure').text()).not.toContain('units apart')
  })

  it('says so for a champion without data', () => {
    const wrapper = mount(AbilityPanel, { props: { champ: 'Nobody' } })
    expect(wrapper.text()).toContain('No ability data')
  })
})
