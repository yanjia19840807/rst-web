import { z } from 'zod'

export const sessionSchema = z.object({
  toolkitId: z.string().min(1, 'Select a toolkit.'),
  subtaskId: z.string().optional().default(''),
  processedVolume: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce
      .number({
        invalid_type_error: 'Volume must be a number.',
      })
      .int('Volume must be a whole number.')
      .positive('Volume must be greater than zero.')
      .optional(),
  ),
  reference: z.string().trim().max(100, 'Reference must be 100 characters or fewer.'),
  remarks: z.string().trim().max(500, 'Remarks must be 500 characters or fewer.'),
})

export type SessionFormValues = {
  toolkitId: string
  subtaskId?: string
  processedVolume?: number | ''
  reference: string
  remarks: string
}
