import { z } from 'zod'

export const sessionSchema = z.object({
  toolkitId: z.string().min(1, 'Select a toolkit.'),
  subtaskId: z.string().min(1, 'Select a subtask.'),
  processedVolume: z.coerce.number().int().positive('Volume must be greater than zero.'),
  reference: z.string().trim().max(100, 'Reference must be 100 characters or fewer.'),
  remarks: z.string().trim().max(500, 'Remarks must be 500 characters or fewer.'),
})

export type SessionFormValues = z.infer<typeof sessionSchema>
