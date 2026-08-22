import { describe, expect, it } from 'vitest'

import { emptyManualMedian, manualMedianSchema } from '../schemas/manualMedian'

describe('manualMedianSchema', () => {
  it('rejects an empty draft', () => {
    const result = manualMedianSchema.safeParse(emptyManualMedian())
    expect(result.success).toBe(false)
  })

  it('rejects a zero or negative median', () => {
    const result = manualMedianSchema.safeParse({
      medianSeconds: 0,
      reason: 'Override for training data.',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'medianSeconds')).toBe(
      true,
    )
  })

  it('requires a reason', () => {
    const result = manualMedianSchema.safeParse({
      medianSeconds: 42,
      reason: '   ',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'reason')).toBe(true)
  })

  it('accepts a complete override', () => {
    expect(
      manualMedianSchema.safeParse({
        medianSeconds: 42.5,
        reason: 'Historical tickets are not representative.',
      }).success,
    ).toBe(true)
  })
})
