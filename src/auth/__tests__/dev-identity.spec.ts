import { afterEach, describe, expect, it } from 'vitest'

import {
  applyDevIdentityHeaders,
  captureDevIdentityFromQuery,
  clearDevIdentity,
  DEFAULT_DEV_IDENTITY,
  DEV_CCGID_HEADER,
  DEV_CENTER_HEADER,
  DEV_IDENTITY_STORAGE_KEY,
  DEV_ROLE_HEADER,
  mergeDevIdentity,
  readDevIdentity,
  resolveDevIdentity,
  stripDevIdentityQuery,
  writeDevIdentity,
} from '../dev-identity'

afterEach(() => {
  sessionStorage.removeItem(DEV_IDENTITY_STORAGE_KEY)
})

describe('dev identity override', () => {
  it('captures ccgid and role from the query string', () => {
    expect(
      captureDevIdentityFromQuery({
        ccgid: 'S00813982',
        role: 'supervisor',
        center: 'GBS CHINA',
      }),
    ).toBe(true)

    expect(readDevIdentity()).toEqual({
      ccgid: 'S00813982',
      role: 'SUPERVISOR',
      center: 'GBS CHINA',
    })
  })

  it('ignores blank query values', () => {
    expect(captureDevIdentityFromQuery({ ccgid: '  ', role: '', other: 'keep' })).toBe(false)
    expect(readDevIdentity()).toBeNull()
  })

  it('merges later query params onto the stored identity', () => {
    writeDevIdentity({ ccgid: 'ADMIN001', role: 'ADMIN' })
    captureDevIdentityFromQuery({ role: 'LTH' })

    expect(readDevIdentity()).toEqual({ ccgid: 'ADMIN001', role: 'LTH' })
  })

  it('strips only identity query keys', () => {
    const next = stripDevIdentityQuery({
      ccgid: 'S00813982',
      role: 'SUPERVISOR',
      tab: 'open',
    })

    expect(next).toEqual({ tab: 'open' })
    expect(stripDevIdentityQuery({ tab: 'open' })).toBeNull()
  })

  it('writes identity headers for API calls', () => {
    mergeDevIdentity({ ccgid: 'HO001', role: 'HO', center: 'Kuala Lumpur' })
    const headers = new Headers()
    applyDevIdentityHeaders(headers)

    expect(headers.get(DEV_CCGID_HEADER)).toBe('HO001')
    expect(headers.get(DEV_ROLE_HEADER)).toBe('HO')
    expect(headers.get(DEV_CENTER_HEADER)).toBe('Kuala Lumpur')
  })

  it('falls back to the frontend default when nothing is stored', () => {
    expect(resolveDevIdentity()).toEqual(DEFAULT_DEV_IDENTITY)

    const headers = new Headers()
    applyDevIdentityHeaders(headers)
    expect(headers.get(DEV_CCGID_HEADER)).toBe(DEFAULT_DEV_IDENTITY.ccgid)
    expect(headers.get(DEV_ROLE_HEADER)).toBe(DEFAULT_DEV_IDENTITY.role)
    expect(headers.get(DEV_CENTER_HEADER)).toBeNull()
  })

  it('clears stored identity', () => {
    writeDevIdentity({ ccgid: 'ADMIN001', role: 'ADMIN' })
    clearDevIdentity()
    expect(readDevIdentity()).toBeNull()
    expect(resolveDevIdentity()).toEqual(DEFAULT_DEV_IDENTITY)
  })
})
