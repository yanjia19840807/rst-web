import { describe, expect, it } from 'vitest'

import { homePathForRoles } from '../home'

describe('homePathForRoles', () => {
  it('sends each role to its landing page', () => {
    expect(homePathForRoles(['AGENT'])).toBe('/agent/session')
    expect(homePathForRoles(['SUPERVISOR'])).toBe('/supervisor/toolkits')
    expect(homePathForRoles(['SR_MANAGER'])).toBe('/approver/queue')
    expect(homePathForRoles(['DOMAIN_HEAD'])).toBe('/approver/queue')
    expect(homePathForRoles(['LOCAL_TRANSFORMATION_HEAD'])).toBe('/approver/queue')
    expect(homePathForRoles(['GOVERNANCE'])).toBe('/approver/dashboard')
    expect(homePathForRoles(['ADMIN'])).toBe('/approver/dashboard')
  })

  it('prefers the higher-privilege home when a user has several roles', () => {
    expect(homePathForRoles(['AGENT', 'SUPERVISOR'])).toBe('/supervisor/toolkits')
    expect(homePathForRoles(['SUPERVISOR', 'LOCAL_TRANSFORMATION_HEAD'])).toBe('/approver/queue')
    expect(homePathForRoles(['LOCAL_TRANSFORMATION_HEAD', 'GOVERNANCE'])).toBe('/approver/dashboard')
    expect(homePathForRoles(['GOVERNANCE', 'ADMIN'])).toBe('/approver/dashboard')
  })

  it('falls back to the agent home when no app role is present', () => {
    expect(homePathForRoles([])).toBe('/agent/session')
  })
})
