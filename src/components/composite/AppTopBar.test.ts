// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppTopBar from './AppTopBar.vue'
import type { WindowControls } from '@/tauri/window'

/** A window that only remembers what was asked of it. */
function fakeControls(maximized = false) {
  const calls: string[] = []
  let resized: (() => void) | undefined
  const controls: WindowControls = {
    minimize: async () => void calls.push('minimize'),
    toggleMaximize: async () => {
      calls.push('toggleMaximize')
      maximized = !maximized
      resized?.()
    },
    close: async () => void calls.push('close'),
    isMaximized: async () => maximized,
    onResized: async (handler) => {
      resized = handler
      return () => {
        resized = undefined
      }
    },
  }
  return { controls, calls }
}

const stubs = { RouterLink: { template: '<a><slot /></a>' } }

describe('AppTopBar', () => {
  it('shows no window buttons without controls, as in a browser', () => {
    const wrapper = mount(AppTopBar, { global: { stubs } })
    expect(wrapper.find('[aria-label="Close"]').exists()).toBe(false)
    expect(wrapper.attributes('data-tauri-drag-region')).toBeDefined()
  })

  it('drives the window from its buttons and follows the maximised state', async () => {
    const { controls, calls } = fakeControls()
    const wrapper = mount(AppTopBar, { props: { controls }, global: { stubs } })
    await nextTick()
    await nextTick()
    expect(wrapper.find('[aria-label="Maximise"]').exists()).toBe(true)

    await wrapper.find('[aria-label="Minimise"]').trigger('click')
    await wrapper.find('[aria-label="Maximise"]').trigger('click')
    await nextTick()
    await nextTick()
    expect(wrapper.find('[aria-label="Restore"]').exists()).toBe(true)

    await wrapper.find('[aria-label="Close"]').trigger('click')
    expect(calls).toEqual(['minimize', 'toggleMaximize', 'close'])
  })
})
