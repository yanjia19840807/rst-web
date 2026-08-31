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
  })

  it('defaults to Admin when no person is specified', () => {
    setActivePinia(createPinia())
    const session = useSessionStore()
    session.applyLocalIdentity()

    expect(session.ccgid).toBe('ADMIN001')
    expect(session.roles).toEqual(['ADMIN'])
    expect(session.hasPermission('timesheet:sync')).toBe(true)
    expect(session.hasPermission('exercise:manage')).toBe(false)
  })
})
