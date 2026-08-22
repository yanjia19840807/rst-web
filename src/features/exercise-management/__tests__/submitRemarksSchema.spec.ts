import { describe, expect, it } from 'vitest'

import {
  emptySubmitRemarks,
  submitRemarksRequiredSchema,
  submitRemarksSchema,
} from '../schemas/submitRemarks'

describe('submitRemarksSchema', () => {
  it('accepts empty optional remarks', () => {
    expect(submitRemarksSchema.safeParse(emptySubmitRemarks()).success).toBe(true)
  })

  it('rejects remarks longer than 2000 characters', () => {
    const result = submitRemarksSchema.safeParse({ remarks: 'x'.repeat(2001) })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'remarks')).toBe(true)
  })
})

describe('submitRemarksRequiredSchema', () => {
  it('requires remarks when severe checks fail', () => {
    const result = submitRemarksRequiredSchema().safeParse({ remarks: '   ' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'remarks')).toBe(true)
  })

  it('accepts a non-empty remark', () => {
    expect(
      submitRemarksRequiredSchema().safeParse({ remarks: 'Daily totals need review.' }).success,
    ).toBe(true)
  })
})
