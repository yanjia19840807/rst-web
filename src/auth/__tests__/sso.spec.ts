import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest } from '@/api/client'

import {
  consumeSsoCallbackError,
  isSsoEnabled,
  redirectToSso,
  resetSsoCallbackFailure,
  SSO_AUTH_PATH,
  ssoErrorMessage,
} from '../sso'

afterEach(() => {
  resetSsoCallbackFailure()
  vi.unstubAllGlobals()
})

describe('SSO helpers', () => {
  it('is off in local/test builds', () => {
    expect(isSsoEnabled()).toBe(false)
  })

  it('redirects to /api/sso/auth', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign, pathname: '/supervisor/toolkits' } })
    redirectToSso('/supervisor/toolkits')
    expect(assign).toHaveBeenCalledWith(
      `${SSO_AUTH_PATH}?return=${encodeURIComponent('/supervisor/toolkits')}`,
    )
  })

  it('blocks automatic redirect after a callback error until reset', () => {
    const assign = vi.fn()
    const replaceState = vi.fn()
    vi.stubGlobal('window', {
      location: {
        assign,
        search: '?ssoError=sso-role-missing',
        pathname: '/',
        hash: '',
      },
      history: { replaceState, state: null },
    })
    expect(consumeSsoCallbackError()).toBe('SSO role is missing.')
    redirectToSso()
    expect(assign).not.toHaveBeenCalled()
    resetSsoCallbackFailure()
    redirectToSso()
    expect(assign).toHaveBeenCalledWith(SSO_AUTH_PATH)
  })

  it('maps callback error codes to readable text', () => {
    expect(ssoErrorMessage('sso-timesheet-missing')).toBe(
      'CCGID is not in the ACTIVE Daily Timesheet.',
    )
    expect(ssoErrorMessage('sso-env-mismatch')).toBe('SSO role does not match this environment.')
  })

  it('consumes ssoError from the URL', () => {
    const replaceState = vi.fn()
    vi.stubGlobal('window', {
      location: {
        search: '?ssoError=sso-center-invalid',
        pathname: '/',
        hash: '',
      },
      history: { replaceState, state: null },
    })
    expect(consumeSsoCallbackError()).toBe('Center is missing or is not a GBS China center.')
    expect(replaceState).toHaveBeenCalled()
  })
})

describe('api client cookies', () => {
  it('sends credentials on API calls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ title: 'failed' }),
      }),
    )

    await expect(apiRequest('/api/v1/me')).rejects.toBeInstanceOf(ApiError)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/me',
      expect.objectContaining({ credentials: 'include' }),
    )
  })
})
