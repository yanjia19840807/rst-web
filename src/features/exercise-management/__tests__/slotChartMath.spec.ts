import { describe, expect, it } from 'vitest'

import {
  cumulativeDailyTat,
  instantTat,
  roundedTheoreticalFte,
  shiftSeriesName,
  slotApplicabilityOn,
  sortShiftKeys,
} from '../slotChartMath'

describe('instantTat', () => {
  it('returns 1 when there is no manual volume', () => {
    expect(instantTat(0, 4)).toBe(1)
  })

  it('is 1 minus out-of-SLA over manual, floored at 0', () => {
    expect(instantTat(10, 2)).toBeCloseTo(0.8)
    expect(instantTat(10, 12)).toBe(0)
  })
})

describe('cumulativeDailyTat', () => {
  it('resets the running totals when the calendar date changes', () => {
    const values = cumulativeDailyTat([
      { slotStartAt: '2026-03-01T08:00:00Z', rawVolume: 10, volumeOutsideSla: 2 },
      { slotStartAt: '2026-03-01T08:30:00Z', rawVolume: 10, volumeOutsideSla: 0 },
      { slotStartAt: '2026-03-02T08:00:00Z', rawVolume: 8, volumeOutsideSla: 4 },
    ])
    expect(values[0]).toBeCloseTo(0.8)
    expect(values[1]).toBeCloseTo(0.9)
    expect(values[2]).toBeCloseTo(0.5)
  })

  it('returns 1 when the day has no raw volume yet', () => {
    expect(
      cumulativeDailyTat([
        { slotStartAt: '2026-03-01T00:00:00Z', rawVolume: 0, volumeOutsideSla: 0 },
      ]),
    ).toEqual([1])
  })
})

describe('roundedTheoreticalFte', () => {
  it('matches Excel ROUND to 0 decimals', () => {
    expect(roundedTheoreticalFte(1.4)).toBe(1)
    expect(roundedTheoreticalFte(1.5)).toBe(2)
  })
})

describe('shift series labels', () => {
  it('names stacked series like Excel', () => {
    expect(shiftSeriesName('shift1')).toBe('Shift 1 FTE')
    expect(sortShiftKeys(['shift10', 'shift2', 'shift1'])).toEqual([
      'shift1',
      'shift2',
      'shift10',
    ])
  })
})

describe('slotApplicabilityOn', () => {
  it('accepts calendar SLA within 24h and business-hours SLA within 8h', () => {
    expect(slotApplicabilityOn('CALENDAR', 24 * 60)).toBe(true)
    expect(slotApplicabilityOn('CALENDAR', 24 * 60 + 1)).toBe(false)
    expect(slotApplicabilityOn('BUSINESS_HOURS', 8 * 60)).toBe(true)
    expect(slotApplicabilityOn('BUSINESS_HOURS', 8 * 60 + 1)).toBe(false)
    expect(slotApplicabilityOn('BH', 0.5)).toBe(true)
    expect(slotApplicabilityOn(null, 60)).toBe(true)
    expect(slotApplicabilityOn('BUSINESS_HOURS', null)).toBe(false)
  })
})
