import { z } from 'zod'

import type { TeamSetup, TeamSetupRequest } from '../types'
import { DEFAULT_WEEKEND_CODE, WEEKEND_CODE_OPTIONS, normalizeWeekendCode } from '../weekendCodes'

const WEEKEND_CODES = WEEKEND_CODE_OPTIONS.map((option) => option.value)
const SLA_TYPES = ['BUSINESS_HOURS', 'CALENDAR_HOURS'] as const
const CLOCK_RE = /^([01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

const optionalNonNegative = z
  .union([z.number(), z.null()])
  .refine(
    (value) => value == null || (Number.isFinite(value) && value >= 0),
    'Must be zero or greater.',
  )

const optionalRatio = z
  .union([z.number(), z.null()])
  .refine(
    (value) => value == null || (Number.isFinite(value) && value >= 0 && value <= 1),
    'Must be between 0% and 100%.',
  )

const slaTypeSchema = z
  .string()
  .refine(
    (value) => value === '' || (SLA_TYPES as readonly string[]).includes(value),
    'Select a valid SLA type.',
  )

const clockSchema = z
  .string()
  .refine((value) => value === '' || CLOCK_RE.test(value.trim()), 'Enter a valid time.')

const weekendCodeSchema = z
  .string()
  .refine((value) => WEEKEND_CODES.includes(value as (typeof WEEKEND_CODES)[number]), {
    message: 'Select a weekend code.',
  })

export const teamSetupFormSchema = z
  .object({
    agentsLt6m: optionalNonNegative,
    agents6To24m: optionalNonNegative,
    agents24To48m: optionalNonNegative,
    agentsGt48m: optionalNonNegative,
    paidLeaveDays: optionalNonNegative,
    otherLeaveDays: optionalNonNegative,
    availabilityRatio: optionalRatio,
    automationRatio: optionalRatio,
    maxOvertimeMinutes: optionalNonNegative,
    slaType: slaTypeSchema,
    slaTargetRatio: optionalRatio,
    slaTurnaroundMinutes: optionalNonNegative,
    slaStartTime: clockSchema,
    slaEndTime: clockSchema,
    slaWeekendEnabled: z.boolean().nullable(),
    weekendShiftHc: optionalNonNegative,
    skeletonRatio: optionalRatio,
    weekendCode: weekendCodeSchema,
  })
  .superRefine((value, ctx) => {
    const start = value.slaStartTime.trim()
    const end = value.slaEndTime.trim()
    if (start && !end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slaEndTime'],
        message: 'Set both SLA clock start and end.',
      })
    }
    if (end && !start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slaStartTime'],
        message: 'Set both SLA clock start and end.',
      })
    }
  })

/** Request payload after empty strings are normalized to null. */
export const teamSetupRequestSchema = teamSetupFormSchema.transform((value) =>
  toTeamSetupRequest(value),
)

export type TeamSetupFormValues = z.input<typeof teamSetupFormSchema>

export function emptyTeamSetupForm(): TeamSetupFormValues {
  return {
    agentsLt6m: null,
    agents6To24m: null,
    agents24To48m: null,
    agentsGt48m: null,
    paidLeaveDays: null,
    otherLeaveDays: null,
    availabilityRatio: null,
    automationRatio: null,
    maxOvertimeMinutes: null,
    slaType: '',
    slaTargetRatio: null,
    slaTurnaroundMinutes: null,
    slaStartTime: '',
    slaEndTime: '',
    slaWeekendEnabled: null,
    weekendShiftHc: null,
    skeletonRatio: null,
    weekendCode: DEFAULT_WEEKEND_CODE,
  }
}

export function teamSetupToForm(setup: TeamSetup): TeamSetupFormValues {
  return {
    agentsLt6m: setup.agentsLt6m ?? null,
    agents6To24m: setup.agents6To24m ?? null,
    agents24To48m: setup.agents24To48m ?? null,
    agentsGt48m: setup.agentsGt48m ?? null,
    paidLeaveDays: setup.paidLeaveDays ?? null,
    otherLeaveDays: setup.otherLeaveDays ?? null,
    availabilityRatio: setup.availabilityRatio ?? null,
    automationRatio: setup.automationRatio ?? null,
    maxOvertimeMinutes: setup.maxOvertimeMinutes ?? null,
    slaType: setup.slaType ?? '',
    slaTargetRatio: setup.slaTargetRatio ?? null,
    slaTurnaroundMinutes: setup.slaTurnaroundMinutes ?? null,
    slaStartTime: setup.slaStartTime ?? '',
    slaEndTime: setup.slaEndTime ?? '',
    slaWeekendEnabled: setup.slaWeekendEnabled ?? null,
    weekendShiftHc: setup.weekendShiftHc ?? null,
    skeletonRatio: setup.skeletonRatio ?? null,
    weekendCode: normalizeWeekendCode(setup.weekendCode),
  }
}

export function toTeamSetupRequest(values: TeamSetupFormValues): TeamSetupRequest {
  return {
    agentsLt6m: values.agentsLt6m,
    agents6To24m: values.agents6To24m,
    agents24To48m: values.agents24To48m,
    agentsGt48m: values.agentsGt48m,
    paidLeaveDays: values.paidLeaveDays,
    otherLeaveDays: values.otherLeaveDays,
    availabilityRatio: values.availabilityRatio,
    automationRatio: values.automationRatio,
    maxOvertimeMinutes: values.maxOvertimeMinutes,
    slaType: values.slaType || null,
    slaTargetRatio: values.slaTargetRatio,
    slaTurnaroundMinutes: values.slaTurnaroundMinutes,
    slaStartTime: values.slaStartTime || null,
    slaEndTime: values.slaEndTime || null,
    slaWeekendEnabled: values.slaWeekendEnabled,
    weekendShiftHc: values.weekendShiftHc,
    skeletonRatio: values.skeletonRatio,
    weekendCode: values.weekendCode || DEFAULT_WEEKEND_CODE,
  }
}
