import { describe, expect, it } from 'vitest'

import {
  annualMultiplier,
  fteAnnualHours,
  hoursPerYear,
  sumSupportFte,
  supportFte,
} from '../supportOptions'

describe('supportOptions', () => {
  it('does not invent 261 working days for Daily', () => {
    expect(annualMultiplier('DAILY', null)).toBeNull()
    expect(annualMultiplier('DAILY', 0)).toBeNull()
    expect(annualMultiplier('DAILY', 250)).toBe(250)
    expect(annualMultiplier('WEEKLY', null)).toBe(52)
    expect(annualMultiplier('UNKNOWN', 250)).toBeNull()
  })

  it('does not invent 2080 annual hours', () => {
    expect(fteAnnualHours({})).toBeNull()
    expect(
      fteAnnualHours({
        workingHoursPerDay: 8,
        availabilityRatio: 0.85,
        workingDaysPerYear: 261,
        capacityRatio: 1,
      }),
    ).toBeCloseTo(1774.8)
  })

  it('leaves FTE empty when the denominator is missing', () => {
    expect(hoursPerYear(10, 30, null)).toBeNull()
    expect(supportFte(100, null)).toBeNull()
    expect(sumSupportFte([{ supportFte: 0.2 }, { supportFte: null }])).toBeNull()
    expect(sumSupportFte([{ supportFte: 0.2 }, { supportFte: 0.3 }])).toBeCloseTo(0.5)
    expect(sumSupportFte([])).toBe(0)
  })
})
