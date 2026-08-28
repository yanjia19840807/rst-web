import { describe, expect, it } from 'vitest'

import {
  emptyGrantDelegationForm,
  grantDelegationSchema,
  toCreateDelegationRequest,
  toDateInput,
} from '../schemas/grantDelegation'

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function validGrant() {
  return {
    delegateCcgid: 'S00813982',
    validFrom: toDateInput(new Date()),
    validUntil: toDateInput(addDays(new Date(), 30)),
  }
}

describe('grantDelegationSchema', () => {
  it('accepts a complete grant payload', () => {
    expect(grantDelegationSchema.safeParse(validGrant()).success).toBe(true)
  })

  it('requires a delegate', () => {
    const result = grantDelegationSchema.safeParse({
      ...validGrant(),
      delegateCcgid: null,
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'delegateCcgid')).toBe(
      true,
    )
  })

  it('requires start and end dates', () => {
    const blank = grantDelegationSchema.safeParse({
      ...emptyGrantDelegationForm(),
      validFrom: '',
      validUntil: '',
    })
    expect(blank.success).toBe(false)
    if (blank.success) return
    const paths = blank.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('validFrom')
    expect(paths).toContain('validUntil')
  })

  it('requires end date on or after start date', () => {
    const result = grantDelegationSchema.safeParse({
      ...validGrant(),
      validFrom: toDateInput(addDays(new Date(), 10)),
      validUntil: toDateInput(addDays(new Date(), 1)),
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'validUntil')).toBe(true)
  })

  it('rejects an end date in the past', () => {
    const result = grantDelegationSchema.safeParse({
      ...validGrant(),
      validFrom: toDateInput(addDays(new Date(), -7)),
      validUntil: toDateInput(addDays(new Date(), -1)),
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'validUntil')).toBe(true)
  })

  it('accepts the same calendar day for start and end', () => {
    const today = toDateInput(new Date())
    expect(
      grantDelegationSchema.safeParse({
        ...validGrant(),
        validFrom: today,
        validUntil: today,
      }).success,
    ).toBe(true)
  })
})

describe('toCreateDelegationRequest', () => {
  it('sends start of day and end of day timestamps', () => {
    const payload = toCreateDelegationRequest({
      delegateCcgid: 'S00813982',
      validFrom: '2026-08-27',
      validUntil: '2026-09-26',
    })
    expect(payload.delegateCcgid).toBe('S00813982')
    expect(new Date(payload.validFrom).getHours()).toBe(0)
    expect(new Date(payload.validUntil).getHours()).toBe(23)
  })
})
