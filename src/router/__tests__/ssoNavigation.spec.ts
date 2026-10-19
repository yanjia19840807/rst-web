import { describe, expect, it } from 'vitest'

import { unsignedSsoRedirect } from '../ssoNavigation'

describe('unsignedSsoRedirect', () => {
  it('stays on the sign-in page', () => {
    expect(unsignedSsoRedirect('sign-in')).toBeNull()
  })

  it('sends an unsigned visit to the sign-in page', () => {
    expect(unsignedSsoRedirect('home')).toEqual({ name: 'sign-in', replace: true })
    expect(unsignedSsoRedirect('supervisor-toolkits')).toEqual({ name: 'sign-in', replace: true })
  })
})