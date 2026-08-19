import { z } from 'zod'

const nullableNumber = z.number().nullable()

/** Editable Team Setup payload sent to PUT /team-setup. */
export const teamSetupRequestSchema = z.object({
  agentsLt6m: nullableNumber,
  agents6To24m: nullableNumber,
  agents24To48m: nullableNumber,
  agentsGt48m: nullableNumber,
  paidLeaveDays: nullableNumber,
  otherLeaveDays: nullableNumber,
  availabilityRatio: nullableNumber,
  automationRatio: nullableNumber,
  maxOvertimeMinutes: nullableNumber,
  slaType: z.string().nullable(),
  slaTargetRatio: nullableNumber,
  slaTurnaroundMinutes: nullableNumber,
  slaStartTime: z.string().nullable(),
  slaEndTime: z.string().nullable(),
  slaWeekendEnabled: z.boolean().nullable(),
  weekendShiftHc: nullableNumber,
  skeletonRatio: nullableNumber,
  weekendCode: z.string().nullable(),
})

export type TeamSetupFormValues = z.infer<typeof teamSetupRequestSchema>
