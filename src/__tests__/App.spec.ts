import { describe, expect, it } from 'vitest'

import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../App.vue'
import { routes } from '../router/routes'

describe('App', () => {
  it('renders the application shell and active route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await router.push('/agent/session')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router, [VueQueryPlugin, { queryClient }]],
        // This test covers shell routing metadata, not feature-level API loading.
        stubs: { RouterView: true },
      },
    })

    expect(wrapper.text()).toContain('Right Sizing Tool')
    expect(wrapper.get('h1').text()).toBe('TMS Session')
    expect(wrapper.get('nav[aria-label="Agent navigation"]').text()).toContain('TMS List')

    wrapper.unmount()
    queryClient.clear()
  }, 10_000)
})
