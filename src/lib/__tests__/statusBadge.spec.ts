import { describe, expect, it } from 'vitest'

import { statusBadgeVariant } from '../statusBadge'

describe('statusBadgeVariant', () => {
  it('uses secondary for active or approved states', () => {
    expect(statusBadgeVariant('ACTIVE')).toBe('secondary')
    expect(statusBadgeVariant('Enabled')).toBe('secondary')
    expect(statusBadgeVariant('Approved')).toBe('secondary')
  })

  it('uses destructive for failed or off states', () => {
    expect(statusBadgeVariant('FAILED')).toBe('destructive')
    expect(statusBadgeVariant('Disabled')).toBe('destructive')
    expect(statusBadgeVariant('Returned')).toBe('destructive')
    expect(statusBadgeVariant('INACTIVE')).toBe('destructive')
  })

  it('uses outline for other enumerations', () => {
    expect(statusBadgeVariant('PENDING')).toBe('outline')
    expect(statusBadgeVariant('Stale')).toBe('outline')
    expect(statusBadgeVariant(null)).toBe('outline')
  })
})
