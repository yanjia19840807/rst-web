import { z } from 'zod'

import type { CreateDelegationRequest } from '../types'

const isoDateSchema = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

export function toDateInput(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

export const grantDelegationSchema = z
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
    const today = toDateInput(new Date())
    if (value.validUntil && value.validUntil < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validUntil'],
        message: 'End date must be today or later.',
      })
    }
  })

export type GrantDelegationValues = z.output<typeof grantDelegationSchema>

export function emptyGrantDelegationForm() {
  return {
    delegateCcgid: '',
    validFrom: toDateInput(new Date()),
    validUntil: toDateInput(addDays(new Date(), 30)),
  }
}

export function toCreateDelegationRequest(
  values: GrantDelegationValues,
): CreateDelegationRequest {
  return {
    delegateCcgid: values.delegateCcgid,
    validFrom: new Date(`${values.validFrom}T00:00:00`).toISOString(),
    validUntil: new Date(`${values.validUntil}T23:59:59`).toISOString(),
  }
}
