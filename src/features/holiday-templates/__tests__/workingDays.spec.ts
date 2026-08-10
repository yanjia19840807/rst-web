import { describe, expect, it } from 'vitest'

import { computeNetworkDays } from '../workingDays'

describe('computeNetworkDays', () => {
  it('matches NETWORKDAYS for 2025 with SAT_SUN and no holidays', () => {
    expect(computeNetworkDays(2025, 'SAT_SUN', [])).toBe(261)
  })

  it('excludes holidays that fall on weekdays', () => {
    const base = computeNetworkDays(2025, 'SAT_SUN', [])
    const withHoliday = computeNetworkDays(2025, 'SAT_SUN', ['2025-01-01']) // Wed
    expect(withHoliday).toBe(base - 1)
  })

  it('does not double-count weekend holidays', () => {
    const base = computeNetworkDays(2025, 'SAT_SUN', [])
    // 2025-01-04 is Saturday
    expect(computeNetworkDays(2025, 'SAT_SUN', ['2025-01-04'])).toBe(base)
  })
})
