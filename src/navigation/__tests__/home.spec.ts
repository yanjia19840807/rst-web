import { describe, expect, it } from 'vitest'

import { homePathForRoles } from '../home'

describe('homePathForRoles', () => {
  it('sends each role to its landing page', () => {
    expect(homePathForRoles(['AGENT'])).toBe('/agent/session')
    expect(homePathForRoles(['SUPERVISOR'])).toBe('/supervisor/toolkits')
    expect(homePathForRoles(['MANAGER'])).toBe('/approver/queue')
    expect(homePathForRoles(['CDH'])).toBe('/approver/queue')
    expect(homePathForRoles(['LTH'])).toBe('/approver/queue')
    expect(homePathForRoles(['HO'])).toBe('/approver/dashboard')
  })

  it('prefers the higher-privilege home when a user has several roles', () => {
    expect(homePathForRoles(['AGENT', 'SUPERVISOR'])).toBe('/supervisor/toolkits')
    expect(homePathForRoles(['SUPERVISOR', 'LTH'])).toBe('/approver/queue')
    expect(homePathForRoles(['LTH', 'HO'])).toBe('/approver/dashboard')
  })

  it('falls back to the agent home when no app role is present', () => {
    expect(homePathForRoles([])).toBe('/agent/session')
  })
})
