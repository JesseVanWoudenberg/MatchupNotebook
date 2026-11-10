// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TipEditor from './TipEditor.vue'
import { useChampionStore } from '@/stores/champions'
import { makeTip } from '@/test/fixtures'

describe('TipEditor', () => {
  beforeEach(() => {
    const pinia = setActivePinia(createPinia())
    useChampionStore(pinia).initialize()
  })

  it('offers matchup, my champ and enemy scopes for a full view', () => {
    const wrapper = mount(TipEditor, {
      props: { view: { myChamp: 'Taliyah', enemy: 'Yasuo' }, defaultPatch: '26.20' },
    })
    const labels = wrapper
      .findAll('select')
      .at(0)!
      .findAll('option')
      .map((o) => o.text())
    expect(labels).toEqual(['Taliyah vs Yasuo', 'Taliyah in general', 'Against Yasuo'])
  })

  it('refuses to save empty text and shows the error inline', async () => {
    const wrapper = mount(TipEditor, {
      props: { view: { myChamp: 'Taliyah' }, defaultPatch: '26.20' },
    })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.text()).toContain('Write something first.')
  })

  it('emits a scoped tip with the role when the lane box is ticked', async () => {
    const wrapper = mount(TipEditor, {
      props: { view: { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' }, defaultPatch: '26.20' },
    })
    await wrapper.find('textarea').setValue('Hold W for his dash.')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      scope: { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' },
      kind: 'general',
      text: 'Hold W for his dash.',
      patch: '26.20',
    })
  })

  it('prefills from an existing tip', () => {
    const tip = makeTip({ kind: 'early', patch: '26.18' })
    const wrapper = mount(TipEditor, {
      props: { view: { myChamp: 'Taliyah', enemy: 'Yasuo' }, tip, defaultPatch: '26.20' },
    })
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(tip.text)
    expect(wrapper.find('[role="radio"][aria-checked="true"]').attributes('aria-label')).toBe(
      'Early game',
    )
    // The patch is shown, never typed: an edited tip keeps its own.
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Patch 26.18')
  })

  it('picks a kind with the icon buttons', async () => {
    const wrapper = mount(TipEditor, {
      props: { view: { myChamp: 'Taliyah' }, defaultPatch: '26.20' },
    })
    await wrapper.find('textarea').setValue('Shove first.')
    await wrapper.find('[role="radio"][aria-label="Setup"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ kind: 'setup', patch: '26.20' })
  })
})
