import { describe, expect, it } from 'vitest'

import {
  createExercisePeriodsSchema,
  editExercisePeriodsSchema,
  emptyCreateExercisePeriodsForm,
  slotPeriodSchema,
  tmsPeriodSchema,
} from '../schemas/exercisePeriods'

function validCreate() {
  return {
    toolkitId: 'tk-1',
    sizingMonth: '2026-03',
  }
}

describe('createExercisePeriodsSchema', () => {
  it('accepts a complete create payload without slot or TMS period', () => {
    expect(createExercisePeriodsSchema.safeParse(validCreate()).success).toBe(true)
  })

  it('requires toolkit and sizing month only', () => {
    const blank = createExercisePeriodsSchema.safeParse(emptyCreateExercisePeriodsForm())
    expect(blank.success).toBe(false)
    if (blank.success) return
    const paths = blank.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('toolkitId')
    expect(paths).toContain('sizingMonth')
    expect(paths).not.toContain('tmsFrom')
    expect(paths).not.toContain('tmsTo')
    expect(paths).not.toContain('slotStartDate')
    expect(paths).not.toContain('slotWeeks')
  })

  it('rejects sizingMonth that is not YYYY-MM', () => {
    const result = createExercisePeriodsSchema.safeParse({
      ...validCreate(),
      sizingMonth: '2026-3',
    })
    expect(result.success).toBe(false)
  })
})

describe('editExercisePeriodsSchema', () => {
  it('does not require toolkitId', () => {
    expect(editExercisePeriodsSchema.safeParse({ sizingMonth: '2026-03' }).success).toBe(true)
  })
})

describe('tmsPeriodSchema', () => {
  it('accepts an inclusive from / to range', () => {
    expect(
      tmsPeriodSchema.safeParse({
        tmsFrom: '2026-01-01',
        tmsTo: '2026-01-31',
      }).success,
    ).toBe(true)
  })

  it('requires both dates', () => {
    const result = tmsPeriodSchema.safeParse({ tmsFrom: '', tmsTo: '' })
    expect(result.success).toBe(false)
    if (result.success) return
    const paths = result.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('tmsFrom')
    expect(paths).toContain('tmsTo')
  })

  it('requires tmsTo on or after tmsFrom', () => {
    const result = tmsPeriodSchema.safeParse({
      tmsFrom: '2026-02-01',
      tmsTo: '2026-01-01',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'tmsTo')).toBe(true)
  })
})

describe('slotPeriodSchema', () => {
  it('accepts start date and 1–12 weeks', () => {
    const result = slotPeriodSchema.safeParse({
      slotStartDate: '2026-03-01',
      slotWeeks: 4,
    })
    expect(result.success).toBe(true)
  })

  it('rejects slotWeeks outside 1–12', () => {
    const result = slotPeriodSchema.safeParse({
      slotStartDate: '2026-03-01',
      slotWeeks: 13,
    })
    expect(result.success).toBe(false)
  })

  it('coerces slotWeeks from select string values', () => {
    const result = slotPeriodSchema.safeParse({
      slotStartDate: '2026-03-01',
      slotWeeks: '6',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.slotWeeks).toBe(6)
  })
})
