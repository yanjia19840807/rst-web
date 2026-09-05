import { afterEach, describe, expect, it } from 'vitest'

import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import { clearDevIdentity, writeDevIdentity } from '@/auth/dev-identity'

import App from '../App.vue'
import { routes } from '../router/routes'

describe('App', () => {
  afterEach(() => {
    clearDevIdentity()
  })

  it('renders the application shell and active route', async () => {
    writeDevIdentity({
      ccgid: 'S00628182',
      role: 'SUPERVISOR',
      center: 'Kuala Lumpur',
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await router.push('/supervisor/toolkits')
    await router.isReady()

    const wrapper = mount(App, {
      attachTo: document.body,
      global: {
        plugins: [createPinia(), router, [VueQueryPlugin, { queryClient }]],
        // This test covers shell routing metadata, not feature-level API loading.
        stubs: { RouterView: true },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Right Sizing Tool')
    expect(wrapper.get('h1').text()).toBe('Toolkits')
    expect(wrapper.get('nav[aria-label="Application"]').text()).toContain('Toolkits')
    expect(wrapper.get('nav[aria-label="Application"]').text()).toContain('Exercises')
    expect(wrapper.get('nav[aria-label="Application"]').text()).not.toContain('Approval Queue')
    expect(wrapper.text()).toContain('YANG Brenda')
    expect(wrapper.text()).toContain('Supervisor')

    const themeToggle = wrapper.get('button[aria-label="Switch to dark mode"]')
    await themeToggle.trigger('click')
    await flushPromises()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(wrapper.get('button[aria-label="Switch to light mode"]').exists()).toBe(true)
    await wrapper.get('button[aria-label="Switch to light mode"]').trigger('click')
    await flushPromises()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')

    await wrapper.get('button[aria-label="Open account menu"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('S00628182')
    expect(document.body.textContent).toContain('s00628182@dev.local')
    expect(document.body.textContent).toContain('Sign out')

    wrapper.unmount()
    queryClient.clear()
  }, 10_000)
})
