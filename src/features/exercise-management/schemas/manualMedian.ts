import { z } from 'zod'

export const manualMedianSchema = z.object({
  medianSeconds: z
    .union([z.number(), z.null()])
    .superRefine((value, ctx) => {
      if (value == null || !Number.isFinite(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Median seconds is required.',
        })
        return
      }
      if (value <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Median seconds must be greater than zero.',
        })
      }
    }),
  reason: z.string().trim().min(1, 'Reason is required.'),
})

export type ManualMedianValues = z.input<typeof manualMedianSchema>

export function emptyManualMedian(): ManualMedianValues {
  return {
    medianSeconds: null,
    reason: '',
  }
}
