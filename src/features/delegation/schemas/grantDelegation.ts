import { parseDate, Time, toCalendarDateTime, toZoned } from '@internationalized/date'
import { z } from 'zod'

import { formatToday } from '@/lib/datetime'

import type { CreateDelegationRequest } from '../types'

const isoDateSchema = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)

function addCivilDays(date: string, days: number): string {
  return parseDate(date).add({ days }).toString()
}

function civilAtZoneToIso(
  date: string,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): string {
  return toZoned(toCalendarDateTime(parseDate(date), new Time(hour, minute, second)), timeZone)
    .toDate()
    .toISOString()
}

export function grantDelegationSchema(timeZone: string) {
  const today = formatToday(timeZone)
  return z
    .object({
      delegateCcgid: z.preprocess(
        (value) => (value == null ? '' : value),
        z.string().trim().min(1, 'Select a person to act for you.'),
      ),
      validFrom: isoDateSchema('Please choose a start date.'),
      validUntil: isoDateSchema('Please choose an end date.'),
    })
    .superRefine((value, ctx) => {
      if (value.validFrom && value.validUntil && value.validUntil < value.validFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['validUntil'],
          message: 'End date must be on or after the start date.',
        })
      }
      if (value.validUntil && value.validUntil < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['validUntil'],
          message: 'End date must be today or later.',
        })
      }
    })
}

export type GrantDelegationValues = z.output<ReturnType<typeof grantDelegationSchema>>

export function emptyGrantDelegationForm(timeZone: string) {
  const today = formatToday(timeZone)
  return {
    delegateCcgid: '',
    validFrom: today,
    validUntil: addCivilDays(today, 30),
  }
}

export function toCreateDelegationRequest(
  values: GrantDelegationValues,
  timeZone: string,
): CreateDelegationRequest {
  return {
    delegateCcgid: values.delegateCcgid,
    validFrom: civilAtZoneToIso(values.validFrom, 0, 0, 0, timeZone),
    validUntil: civilAtZoneToIso(values.validUntil, 23, 59, 59, timeZone),
  }
}
