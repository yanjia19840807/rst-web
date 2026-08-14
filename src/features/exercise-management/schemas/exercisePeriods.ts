import { z } from 'zod'

const sizingMonthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, 'Please select a Sizing Month.')

const isoDateSchema = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)

const slotWeeksSchema = z.preprocess(
  (value) => {
    if (value === '' || value == null) return undefined
    return typeof value === 'string' ? Number(value) : value
  },
  z
    .number({
      required_error: 'Please complete the Slot Period.',
      invalid_type_error: 'Please complete the Slot Period.',
    })
    .int('Please complete the Slot Period.')
    .min(1, 'Slot weeks must be between 1 and 12.')
    .max(12, 'Slot weeks must be between 1 and 12.'),
)

const periodsBaseSchema = z.object({
  sizingMonth: sizingMonthSchema,
  slotStartDate: isoDateSchema('Please complete the Slot Period.'),
  slotWeeks: slotWeeksSchema,
  tmsFrom: isoDateSchema('Please complete the TMS period.'),
  tmsTo: isoDateSchema('Please complete the TMS period.'),
})

function withTmsOrder<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const data = value as { tmsFrom?: string; tmsTo?: string }
    if (data.tmsFrom && data.tmsTo && data.tmsTo < data.tmsFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tmsTo'],
        message: 'TMS period end must be on or after the start date.',
      })
    }
  })
}

export const createExercisePeriodsSchema = withTmsOrder(
  periodsBaseSchema.extend({
    toolkitId: z.string().trim().min(1, 'Please select a Toolkit.'),
  }),
)

export const editExercisePeriodsSchema = withTmsOrder(periodsBaseSchema)

export type CreateExercisePeriodsValues = z.output<typeof createExercisePeriodsSchema>
export type EditExercisePeriodsValues = z.output<typeof editExercisePeriodsSchema>

export function emptyCreateExercisePeriodsForm(toolkitId = '') {
  return {
    toolkitId,
    sizingMonth: '',
    slotStartDate: '',
    slotWeeks: '' as number | '',
    tmsFrom: '',
    tmsTo: '',
  }
}

export function emptyEditExercisePeriodsForm(): {
  sizingMonth: string
  slotStartDate: string
  slotWeeks: number
  tmsFrom: string
  tmsTo: string
} {
  return {
    sizingMonth: '',
    slotStartDate: '',
    slotWeeks: 4,
    tmsFrom: '',
    tmsTo: '',
  }
}
