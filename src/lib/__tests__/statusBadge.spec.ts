import { describe, expect, it } from 'vitest'

import { statusBadgeVariant } from '../statusBadge'

describe('statusBadgeVariant', () => {
  it('uses success for active or approved states', () => {
    expect(statusBadgeVariant('ACTIVE')).toBe('success')
    expect(statusBadgeVariant('Enabled')).toBe('success')
    expect(statusBadgeVariant('Approved')).toBe('success')
    expect(statusBadgeVariant('Validated')).toBe('success')
    expect(statusBadgeVariant('OK')).toBe('success')
  })

  it('uses destructive for failed or off states', () => {
    expect(statusBadgeVariant('FAILED')).toBe('destructive')
    expect(statusBadgeVariant('Disabled')).toBe('destructive')
    expect(statusBadgeVariant('Returned')).toBe('destructive')
    expect(statusBadgeVariant('INACTIVE')).toBe('destructive')
    expect(statusBadgeVariant('SEVERE')).toBe('destructive')
  })

  it('uses warning for warning severity', () => {
    expect(statusBadgeVariant('WARNING')).toBe('warning')
  })

  it('uses outline for other enumerations', () => {
    expect(statusBadgeVariant('PENDING')).toBe('outline')
    expect(statusBadgeVariant('Stale')).toBe('outline')
    expect(statusBadgeVariant(null)).toBe('outline')
  })
})
