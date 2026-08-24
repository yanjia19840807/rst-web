import { describe, expect, it } from 'vitest'

import { computeNetworkDays } from '../workingDays'

describe('computeNetworkDays', () => {
  it('matches NETWORKDAYS for 2025 with weekend code 1 and no holidays', () => {
    expect(computeNetworkDays(2025, '1', [])).toBe(261)
    expect(computeNetworkDays(2025, 'SAT_SUN', [])).toBe(261)
  })

  it('excludes holidays that fall on weekdays', () => {
    const base = computeNetworkDays(2025, '1', [])
    const withHoliday = computeNetworkDays(2025, '1', ['2025-01-01']) // Wed
    expect(withHoliday).toBe(base - 1)
  })

  it('does not double-count weekend holidays', () => {
    const base = computeNetworkDays(2025, '1', [])
    // 2025-01-04 is Saturday
    expect(computeNetworkDays(2025, '1', ['2025-01-04'])).toBe(base)
  })

  it('does not invent Saturday-Sunday for an unknown weekend code', () => {
    expect(computeNetworkDays(2025, 'NONE', [])).toBeNull()
    expect(computeNetworkDays(2025, '99', [])).toBeNull()
    expect(computeNetworkDays(2025, null, [])).toBeNull()
  })
})
