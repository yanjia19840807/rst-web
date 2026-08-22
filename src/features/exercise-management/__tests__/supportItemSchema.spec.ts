import { describe, expect, it } from 'vitest'

import { emptySupportItemForm, supportItemFormSchema } from '../schemas/supportItem'

describe('supportItemFormSchema', () => {
  it('rejects an empty add-row draft', () => {
    const result = supportItemFormSchema.safeParse(emptySupportItemForm())
    expect(result.success).toBe(false)
    if (result.success) return
    const paths = result.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('categoryId')
    expect(paths).toContain('activity')
    expect(paths).toContain('volume')
    expect(paths).toContain('workloadPerUnitMinutes')
  })

  it('rejects an unknown frequency', () => {
    const result = supportItemFormSchema.safeParse({
      ...emptySupportItemForm('cat-1', 'Admin'),
      activity: 'Inbox triage',
      frequencyCode: 'YEARLY',
      volume: 10,
      workloadPerUnitMinutes: 5,
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'frequencyCode')).toBe(
      true,
    )
  })

  it('rejects comments longer than 500 characters', () => {
    const result = supportItemFormSchema.safeParse({
      ...emptySupportItemForm('cat-1', 'Admin'),
      activity: 'Inbox triage',
      volume: 10,
      workloadPerUnitMinutes: 5,
      comments: 'x'.repeat(501),
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'comments')).toBe(true)
  })

  it('accepts a complete workload row', () => {
    expect(
      supportItemFormSchema.safeParse({
        ...emptySupportItemForm('cat-1', 'Admin'),
        activity: 'Inbox triage',
        frequencyCode: 'MONTHLY',
        volume: 12,
        unitOfMeasure: 'Tickets',
        workloadPerUnitMinutes: 8,
        comments: 'Peak season only',
      }).success,
    ).toBe(true)
  })
})
