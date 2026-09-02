import { describe, expect, it } from 'vitest'

import { formatKpiLine, missingAlignmentLines, type TimesheetAlignmentView } from '../types'

const alignment: TimesheetAlignmentView = {
  structuralDrift: true,
  outOfScope: false,
  currentMonthlySyncDate: '2026-08-31',
  currentDeliveryHc: 12.5,
  lines: [
    {
      carrier: 'CMA CGM',
      site: 'Sydney',
      customerCountry: 'Australia',
      missing: false,
      currentDeliveryHc: 12.5,
    },
    {
      carrier: 'ANL',
      site: 'Jakarta',
      customerCountry: 'Indonesia',
      missing: true,
      currentDeliveryHc: null,
    },
  ],
}

describe('timesheet alignment helpers', () => {
  it('lists only missing Shared KPI lines', () => {
    expect(missingAlignmentLines(alignment)).toEqual([alignment.lines[1]])
    expect(missingAlignmentLines(null)).toEqual([])
  })

  it('formats a KPI line for alerts and tables', () => {
    expect(formatKpiLine(alignment.lines[1]!)).toBe('ANL / Jakarta / Indonesia')
  })
})
