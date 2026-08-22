import { describe, expect, it } from 'vitest'

import {
  dailyVolumeContextIssue,
  dailyVolumeRowSchema,
  emptyMonthlyVolumeRow,
  monthlyVolumeContextIssue,
  monthlyVolumeRowSchema,
  slotVolumeRowSchema,
} from '../schemas/volume'

describe('monthlyVolumeRowSchema', () => {
  it('rejects an empty draft', () => {
    const result = monthlyVolumeRowSchema.safeParse(emptyMonthlyVolumeRow())
    expect(result.success).toBe(false)
  })

  it('rejects a negative volume', () => {
    const result = monthlyVolumeRowSchema.safeParse({
      month: '2026-01',
      actualVolume: -1,
      commercialRatio: null,
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'actualVolume')).toBe(true)
  })

  it('accepts a complete month row', () => {
    expect(
      monthlyVolumeRowSchema.safeParse({
        month: '2026-01',
        actualVolume: 1200,
        commercialRatio: 0.05,
      }).success,
    ).toBe(true)
  })
})

describe('dailyVolumeRowSchema', () => {
  it('requires a date and volume', () => {
    const result = dailyVolumeRowSchema.safeParse({
      volumeDate: '',
      actualVolume: null,
      dailyAdjustmentRatio: null,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a complete day row', () => {
    expect(
      dailyVolumeRowSchema.safeParse({
        volumeDate: '2026-01-15',
        actualVolume: 40,
        dailyAdjustmentRatio: null,
      }).success,
    ).toBe(true)
  })
})

describe('slotVolumeRowSchema', () => {
  it('requires a non-negative volume', () => {
    expect(slotVolumeRowSchema.safeParse({ actualVolume: null }).success).toBe(false)
    expect(slotVolumeRowSchema.safeParse({ actualVolume: 0 }).success).toBe(true)
  })
})

describe('monthlyVolumeContextIssue', () => {
  it('rejects a month after sizing month', () => {
    expect(
      monthlyVolumeContextIssue('2026-03', { sizingMonth: '2026-02', otherMonths: [] })?.path,
    ).toBe('month')
  })

  it('rejects a duplicate month', () => {
    expect(
      monthlyVolumeContextIssue('2026-01', {
        sizingMonth: '2026-03',
        otherMonths: ['2026-01', '2026-02'],
      })?.message,
    ).toContain('already')
  })

  it('rejects a gap in the series', () => {
    expect(
      monthlyVolumeContextIssue('2026-04', {
        sizingMonth: '2026-06',
        otherMonths: ['2026-01', '2026-02'],
      })?.message,
    ).toContain('consecutive')
  })

  it('allows extending the first or last month', () => {
    expect(
      monthlyVolumeContextIssue('2025-12', {
        sizingMonth: '2026-03',
        otherMonths: ['2026-01', '2026-02'],
      }),
    ).toBeNull()
  })
})

describe('dailyVolumeContextIssue', () => {
  it('rejects a date after sizing month', () => {
    expect(
      dailyVolumeContextIssue('2026-02-01', {
        sizingMonthEnd: '2026-01-31',
        otherDates: [],
      })?.path,
    ).toBe('volumeDate')
  })

  it('rejects a gap in the series', () => {
    expect(
      dailyVolumeContextIssue('2026-01-04', {
        sizingMonthEnd: '2026-01-31',
        otherDates: ['2026-01-01', '2026-01-02'],
      })?.message,
    ).toContain('consecutive')
  })
})
