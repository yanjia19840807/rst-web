import { z } from 'zod'

import { addDaysIso, shiftYearMonth } from '../periodWindows'

const MONTH_RE = /^\d{4}-\d{2}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const requiredVolume = z
  .union([z.number(), z.null()])
  .superRefine((value, ctx) => {
    if (value == null || !Number.isFinite(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Actual Volume is required.',
      })
      return
    }
    if (value < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Volume must be non-negative.',
      })
    }
  })

const optionalFinite = z
  .union([z.number(), z.null()])
  .refine((value) => value == null || Number.isFinite(value), 'Must be a number.')

export const monthlyVolumeRowSchema = z.object({
  month: z.string().trim().regex(MONTH_RE, 'Choose a month.'),
  actualVolume: requiredVolume,
  commercialRatio: optionalFinite,
})

export const dailyVolumeRowSchema = z.object({
  volumeDate: z.string().trim().regex(DATE_RE, 'Choose a date.'),
  actualVolume: requiredVolume,
  dailyAdjustmentRatio: optionalFinite,
})

export const slotVolumeRowSchema = z.object({
  actualVolume: requiredVolume,
})

export type MonthlyVolumeRowValues = z.input<typeof monthlyVolumeRowSchema>
export type DailyVolumeRowValues = z.input<typeof dailyVolumeRowSchema>
export type SlotVolumeRowValues = z.input<typeof slotVolumeRowSchema>

export function emptyMonthlyVolumeRow(month = ''): MonthlyVolumeRowValues {
  return { month, actualVolume: null, commercialRatio: null }
}

export function emptyDailyVolumeRow(volumeDate = ''): DailyVolumeRowValues {
  return { volumeDate, actualVolume: null, dailyAdjustmentRatio: null }
}

export function emptySlotVolumeRow(): SlotVolumeRowValues {
  return { actualVolume: null }
}

export function monthsAreContinuous(months: string[]) {
  const keys = [...months].filter((month) => MONTH_RE.test(month)).sort()
  for (let i = 1; i < keys.length; i++) {
    const previous = keys[i - 1]
    const current = keys[i]
    if (!previous || !current || shiftYearMonth(previous, 1) !== current) return false
  }
  return true
}

export function datesAreContinuous(dates: string[]) {
  const keys = [...dates].filter((date) => DATE_RE.test(date)).sort()
  for (let i = 1; i < keys.length; i++) {
    const previous = keys[i - 1]
    const current = keys[i]
    if (!previous || !current || addDaysIso(previous, 1) !== current) return false
  }
  return true
}

export function monthlyVolumeContextIssue(
  month: string,
  ctx: { sizingMonth: string; otherMonths: string[] },
): { path: 'month'; message: string } | null {
  if (month > ctx.sizingMonth) {
    return { path: 'month', message: 'Cannot add a month after Sizing Month.' }
  }
  if (ctx.otherMonths.includes(month)) {
    return { path: 'month', message: `${month} is already on this exercise.` }
  }
  if (!monthsAreContinuous([...ctx.otherMonths, month])) {
    return {
      path: 'month',
      message: 'Months must be consecutive. Add the month before the first or after the last row.',
    }
  }
  return null
}

export function dailyVolumeContextIssue(
  volumeDate: string,
  ctx: { sizingMonthEnd: string; otherDates: string[] },
): { path: 'volumeDate'; message: string } | null {
  if (volumeDate > ctx.sizingMonthEnd) {
    return { path: 'volumeDate', message: 'Cannot add a date after Sizing Month.' }
  }
  if (ctx.otherDates.includes(volumeDate)) {
    return { path: 'volumeDate', message: `${volumeDate} is already on this exercise.` }
  }
  if (!datesAreContinuous([...ctx.otherDates, volumeDate])) {
    return {
      path: 'volumeDate',
      message: 'Dates must be consecutive. Add the date before the first or after the last row.',
    }
  }
  return null
}
