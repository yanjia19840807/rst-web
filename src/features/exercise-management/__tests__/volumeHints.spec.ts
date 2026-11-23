import { describe, expect, it } from 'vitest'

import { volumeDailyHint, volumeMonthlyHint, volumeSlotHint } from '../periodWindows'

describe('volume input hints', () => {
  it('names the sizing month Monthly must contain', () => {
    expect(volumeMonthlyHint('2026-10')).toContain('Actual Volume for 2026-10')
    expect(volumeMonthlyHint('2026-10')).toContain('Months before 2026-10 are optional')
    expect(volumeMonthlyHint('2026-10')).toContain('2026-11 – 2027-01')
  })

  it('names the last day Daily must contain once any day is entered', () => {
    expect(volumeDailyHint('2026-10')).toContain('Daily Volume is optional')
    expect(volumeDailyHint('2026-10')).toContain('Actual Volume on 2026-10-31')
    expect(volumeDailyHint('2026-10')).toContain('2026-11-01 – 2026-11-30')
  })

  it('says Slot is separate from Sizing Simulation', () => {
    expect(volumeSlotHint(null, null)).toContain('Sizing Simulation does not use this grid')
    expect(volumeSlotHint('2026-10-06', 2)).toContain('2026-10-06')
    expect(volumeSlotHint('2026-10-06', 2)).toContain('at least one slot')
  })
})
