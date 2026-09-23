import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearDevIdentity, writeDevIdentity } from '../dev-identity'
import { useSessionStore } from '../session'

vi.mock('@/api/client', () => ({
  apiRequest: () => Promise.reject(new Error('offline')),
}))

afterEach(() => {
  clearDevIdentity()
})

describe('session test login', () => {
  it('applies the URL identity even when /me is offline', () => {
    setActivePinia(createPinia())
    writeDevIdentity({ ccgid: 'S00813982', role: 'SUPERVISOR' })

    const session = useSessionStore()
    session.applyLocalIdentity()

    expect(session.ccgid).toBe('S00813982')
    expect(session.roles).toEqual(['SUPERVISOR'])
    expect(session.displayName).toBe('CHEN Cindy')
    expect(session.hasPermission('exercise:manage')).toBe(true)
    expect(session.canManageDelegation).toBe(true)
    expect(session.canManageTeamDelegation).toBe(true)
  })

  it('hides team delegation when the caller is only an Agent', () => {
    setActivePinia(createPinia())
    writeDevIdentity({ ccgid: 'S00661142', role: 'AGENT' })

    const session = useSessionStore()
    session.applyLocalIdentity()

    expect(session.roles).toEqual(['AGENT'])
    expect(session.canManageDelegation).toBe(true)
    expect(session.canManageTeamDelegation).toBe(false)
  })

  it('defaults to Admin when no person is specified', () => {
    setActivePinia(createPinia())
    const session = useSessionStore()
    session.applyLocalIdentity()

    expect(session.ccgid).toBe('ADMIN001')
    expect(session.roles).toEqual(['ADMIN'])
    expect(session.jobRole).toBe('')
    expect(session.hasPermission('timesheet:sync')).toBe(true)
    expect(session.hasPermission('exercise:manage')).toBe(false)
  })

  it('builds a single-line position delegation banner with the occupant', () => {
    setActivePinia(createPinia())
    const session = useSessionStore()
    session.user = {
      ccgid: 'S00813982',
      displayName: 'CHEN Cindy',
      email: 's00813982@dev.local',
      roles: ['SUPERVISOR'],
      scopes: ['SELF'],
      actor: { ccgid: 'S00813982', displayName: 'CHEN Cindy' },
      delegationId: '11111111-1111-1111-1111-111111111111',
      delegatedPositionId: '175344',
      delegatedPositionRoles: ['SUPERVISOR'],
      delegatedOccupantName: 'WU Rongchan',
    }

    expect(session.delegationBanner).toBe(
      'You are a delegate for position 175344 · Supervisor, currently held by WU Rongchan.',
    )
  })
})
