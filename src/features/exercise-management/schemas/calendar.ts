import { z } from 'zod'

import type { CalendarRequest, HolidayRequest } from '../types'
import { HOLIDAY_TYPE_OPTIONS, type HolidayTypeValue } from '../weekendCodes'

const HOLIDAY_TYPES = HOLIDAY_TYPE_OPTIONS.map((option) => option.value)

export const calendarHolidayRowSchema = z.object({
  holidayDate: z
    .string()
    .trim()
    .min(1, 'Choose a date.')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
  holidayName: z.string().max(200, 'Description must be 200 characters or fewer.'),
  holidayType: z
    .string()
    .refine((value) => (HOLIDAY_TYPES as readonly string[]).includes(value), {
      message: 'Select a day type.',
    }),
})

export type CalendarHolidayRowValues = z.input<typeof calendarHolidayRowSchema>

export function emptyCalendarHolidayRow(
  holidayType: HolidayTypeValue = 'HOLIDAY',
): CalendarHolidayRowValues {
  return {
    holidayDate: '',
    holidayName: '',
    holidayType,
  }
}

export function calendarDateTakenIssue(
  holidayDate: string,
  existingDates: string[],
): { path: 'holidayDate'; message: string } | null {
  if (!holidayDate || !existingDates.includes(holidayDate)) return null
  return {
    path: 'holidayDate',
    message: `${holidayDate} is already on this exercise.`,
  }
}

export function toHolidayRequest(values: CalendarHolidayRowValues): HolidayRequest {
  return {
    holidayDate: values.holidayDate.trim(),
    holidayName: values.holidayName.trim(),
    holidayType: values.holidayType,
  }
}

export function toCalendarRequest(holidays: HolidayRequest[]): CalendarRequest {
  return { holidays }
}
