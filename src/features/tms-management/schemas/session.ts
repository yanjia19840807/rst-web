import { z } from 'zod'

export function createSessionSchema(subtaskRequired: boolean) {
  return z.object({
    toolkitId: z.string().min(1, 'Select a toolkit.'),
    subtaskId: subtaskRequired
      ? z.string().min(1, 'Select a TASK.')
      : z.string().optional().default(''),
    processedVolume: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? undefined : value),
      z.coerce
        .number({
          required_error: 'Volume is required.',
          invalid_type_error: 'Volume must be a number.',
        })
        .min(1, 'Volume must be at least 1.'),
    ),
    reference: z.string().trim().max(100, 'Reference must be 100 characters or fewer.'),
    remarks: z.string().trim().max(500, 'Remarks must be 500 characters or fewer.'),
  })
}

export const sessionSchema = createSessionSchema(false)

export type SessionFormValues = {
  toolkitId: string
  subtaskId?: string
  processedVolume: number | ''
  reference: string
  remarks: string
}
