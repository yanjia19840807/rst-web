import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import { useSessionStore } from '@/auth/session'

import SignInPage from '../SignInPage.vue'

function mountPage(setup?: (session: ReturnType<typeof useSessionStore>) => void) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const session = useSessionStore()
  setup?.(session)
  const wrapper = mount(SignInPage, { global: { plugins: [pinia] } })
  return wrapper
}

describe('SignInPage', () => {
  it('shows the callback error without the application shell', () => {
    const wrapper = mountPage((session) => {
      session.acknowledgeSignedOut()
      session.error = 'SSO role is missing.'
    })

    expect(wrapper.text()).toContain('Sign-in failed')
    expect(wrapper.text()).toContain('SSO role is missing.')
    expect(wrapper.text()).toContain('Sign in')
    expect(wrapper.text()).toContain('Sign out')
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Home')
  })

  it('shows a signed-out message when there is no error', () => {
    const wrapper = mountPage((session) => {
      session.acknowledgeSignedOut()
    })

    expect(wrapper.text()).toContain('Signed out')
    expect(wrapper.text()).not.toContain('Sign-in failed')
    expect(wrapper.text()).not.toContain('Sign out')
  })
})
