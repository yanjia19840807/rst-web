import { describe, expect, it } from 'vitest'

import {
  emptyTimesheetSyncFilters,
  matchesSyncDate,
  normalizeKindDates,
  toSyncDateRange,
} from '../timesheetSyncFilters'

describe('timesheetSyncFilters', () => {
  it('maps monthly pickers to the month bounds', () => {
    expect(
      toSyncDateRange({
        ...emptyTimesheetSyncFilters(),
        kind: 'MONTHLY',
        syncDateFrom: '2026-07',
        syncDateTo: '2026-07',
      }),
    ).toEqual({ dateFrom: '2026-07-01', dateTo: '2026-07-31' })
  })

  it('keeps daily pickers as civil dates', () => {
    expect(
      toSyncDateRange({
        ...emptyTimesheetSyncFilters(),
        kind: 'DAILY',
        syncDateFrom: '2026-07-01',
        syncDateTo: '2026-07-15',
      }),
    ).toEqual({ dateFrom: '2026-07-01', dateTo: '2026-07-15' })
  })

  it('matches a monthly snapshot date inside the selected month', () => {
    const filters = {
      ...emptyTimesheetSyncFilters(),
      kind: 'MONTHLY',
      syncDateFrom: '2026-07',
      syncDateTo: '2026-07',
    }
    expect(matchesSyncDate('2026-07-31', filters)).toBe(true)
    expect(matchesSyncDate('2026-06-30', filters)).toBe(false)
  })

  it('converts date fields when Kind switches to monthly', () => {
    const next = normalizeKindDates(
      {
        ...emptyTimesheetSyncFilters(),
        kind: 'DAILY',
        syncDateFrom: '2026-07-15',
        syncDateTo: '2026-08-02',
      },
      'MONTHLY',
    )
    expect(next.syncDateFrom).toBe('2026-07')
    expect(next.syncDateTo).toBe('2026-08')
  })
})
