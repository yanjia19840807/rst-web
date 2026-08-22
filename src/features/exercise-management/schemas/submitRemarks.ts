import { z } from 'zod'

const remarksField = z
  .string()
  .max(2000, 'Remarks must be 2000 characters or fewer.')

export const submitRemarksSchema = z.object({
  remarks: remarksField,
})

export function submitRemarksRequiredSchema() {
  return z.object({
    remarks: remarksField.trim().min(1, 'Remarks are required when severe validation checks fail.'),
  })
}

export type SubmitRemarksValues = z.infer<typeof submitRemarksSchema>

export function emptySubmitRemarks(): SubmitRemarksValues {
  return { remarks: '' }
}
