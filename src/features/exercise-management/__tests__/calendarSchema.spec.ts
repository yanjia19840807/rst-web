import { describe, expect, it } from 'vitest'

import {
  calendarDateTakenIssue,
  calendarHolidayRowSchema,
  emptyCalendarHolidayRow,
} from '../schemas/calendar'

describe('calendarHolidayRowSchema', () => {
  it('rejects an empty add-row draft', () => {
    const result = calendarHolidayRowSchema.safeParse(emptyCalendarHolidayRow())
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'holidayDate')).toBe(true)
  })

  it('rejects an unknown day type', () => {
    const result = calendarHolidayRowSchema.safeParse({
      holidayDate: '2026-01-01',
      holidayName: 'New Year',
      holidayType: 'PTO',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'holidayType')).toBe(true)
  })

  it('rejects a description longer than 200 characters', () => {
    const result = calendarHolidayRowSchema.safeParse({
      holidayDate: '2026-01-01',
      holidayName: 'x'.repeat(201),
      holidayType: 'HOLIDAY',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'holidayName')).toBe(true)
  })

  it('accepts a complete holiday row', () => {
    expect(
      calendarHolidayRowSchema.safeParse({
        holidayDate: '2026-01-01',
        holidayName: 'New Year',
        holidayType: 'HOLIDAY',
      }).success,
    ).toBe(true)
  })
})

describe('calendarDateTakenIssue', () => {
  it('flags a date already on the exercise', () => {
    expect(calendarDateTakenIssue('2026-01-01', ['2026-01-01'])?.message).toContain('already')
  })

  it('allows a new date', () => {
    expect(calendarDateTakenIssue('2026-01-02', ['2026-01-01'])).toBeNull()
  })
})
