import { parseDate, Time, toCalendarDateTime, toZoned } from '@internationalized/date'
import { z } from 'zod'

import { formatToday } from '@/lib/datetime'

import type { AssignDelegationRequest, CreateDelegationRequest } from '../types'

const optionalIsoDate = z.preprocess(
  (value) => (value == null ? '' : String(value).trim()),
  z.string().refine(
    (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'Please choose a valid date.',
  ),
)

function sameCcgid(left: string, right: string) {
  return left.trim().toUpperCase() === right.trim().toUpperCase()
}

function refineWindow(
  value: { validFrom: string; validUntil: string },
  ctx: z.RefinementCtx,
  today: string,
) {
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

export function grantDelegationSchema(timeZone: string, selfCcgid = '') {
  const today = formatToday(timeZone)
  return z
    .object({
      delegateCcgids: z.preprocess(
        (value) => (Array.isArray(value) ? value : []),
        z.array(z.string().trim().min(1)).min(1, 'Select a person to act for you.'),
      ),
      validFrom: optionalIsoDate,
      validUntil: optionalIsoDate,
    })
    .superRefine((value, ctx) => {
      refineWindow(value, ctx, today)
      if (
        selfCcgid &&
        value.delegateCcgids.some((ccgid) => sameCcgid(ccgid, selfCcgid))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['delegateCcgids'],
          message: 'You cannot delegate to yourself.',
        })
      }
    })
}

export type GrantDelegationValues = z.output<ReturnType<typeof grantDelegationSchema>>

export function emptyGrantDelegationForm() {
  return {
    delegateCcgids: [] as string[],
    validFrom: '',
    validUntil: '',
  }
}

export function assignCoverageSchema(
  timeZone: string,
  occupantByPosition: Record<string, string | null | undefined> = {},
) {
  const today = formatToday(timeZone)
  return z
    .object({
      positionId: z.preprocess(
        (value) => (value == null ? '' : value),
        z.string().trim().min(1, 'Select a position.'),
      ),
      delegateCcgids: z.preprocess(
        (value) => (Array.isArray(value) ? value : []),
        z.array(z.string().trim().min(1)).min(1, 'Select a person to act for you.'),
      ),
      validFrom: optionalIsoDate,
      validUntil: optionalIsoDate,
    })
    .superRefine((value, ctx) => {
      refineWindow(value, ctx, today)
      const occupant = occupantByPosition[value.positionId]
      if (
        occupant &&
        value.delegateCcgids.some((ccgid) => sameCcgid(ccgid, occupant))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['delegateCcgids'],
          message: 'The current occupant cannot cover their own position.',
        })
      }
    })
}

export type AssignCoverageValues = z.output<ReturnType<typeof assignCoverageSchema>>

export function emptyAssignCoverageForm() {
  return {
    positionId: '',
    delegateCcgids: [] as string[],
    validFrom: '',
    validUntil: '',
  }
}

function toPeriod(validFrom: string, validUntil: string, timeZone: string) {
  return {
    validFrom: validFrom ? civilAtZoneToIso(validFrom, 0, 0, 0, timeZone) : null,
    validUntil: validUntil ? civilAtZoneToIso(validUntil, 23, 59, 59, timeZone) : null,
  }
}

export function toAssignCoverageRequest(
  values: AssignCoverageValues,
  timeZone: string,
): AssignDelegationRequest {
  return {
    positionId: values.positionId,
    delegateCcgids: values.delegateCcgids,
    ...toPeriod(values.validFrom, values.validUntil, timeZone),
  }
}

export function toCreateDelegationRequest(
  values: GrantDelegationValues,
  timeZone: string,
): CreateDelegationRequest {
  return {
    delegateCcgids: values.delegateCcgids,
    ...toPeriod(values.validFrom, values.validUntil, timeZone),
  }
}
