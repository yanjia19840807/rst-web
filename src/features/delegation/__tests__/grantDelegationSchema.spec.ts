import { parseDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'

import {
  emptyGrantDelegationForm,
  grantDelegationSchema,
  toCreateDelegationRequest,
} from '../schemas/grantDelegation'

const ZONE = 'Asia/Kolkata'

function addDays(date: string, days: number) {
  return parseDate(date).add({ days }).toString()
}

function validGrant() {
  const today = emptyGrantDelegationForm(ZONE).validFrom
  return {
    delegateCcgid: 'S00813982',
    validFrom: today,
    validUntil: addDays(today, 30),
  }
}

describe('grantDelegationSchema', () => {
  const schema = grantDelegationSchema(ZONE)

  it('accepts a complete grant payload', () => {
    expect(schema.safeParse(validGrant()).success).toBe(true)
  })

  it('requires a delegate', () => {
    const result = schema.safeParse({
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
    const blank = schema.safeParse({
      ...emptyGrantDelegationForm(ZONE),
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
    const today = emptyGrantDelegationForm(ZONE).validFrom
    const result = schema.safeParse({
      ...validGrant(),
      validFrom: addDays(today, 10),
      validUntil: addDays(today, 1),
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'validUntil')).toBe(true)
  })

  it('rejects an end date in the past', () => {
    const today = emptyGrantDelegationForm(ZONE).validFrom
    const result = schema.safeParse({
      ...validGrant(),
      validFrom: addDays(today, -7),
      validUntil: addDays(today, -1),
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'validUntil')).toBe(true)
  })

  it('accepts the same calendar day for start and end', () => {
    const today = emptyGrantDelegationForm(ZONE).validFrom
    expect(
      schema.safeParse({
        ...validGrant(),
        validFrom: today,
        validUntil: today,
      }).success,
    ).toBe(true)
  })
})

describe('toCreateDelegationRequest', () => {
  it('converts Center wall-clock day bounds to UTC instants', () => {
    const payload = toCreateDelegationRequest(
      {
        delegateCcgid: 'S00813982',
        validFrom: '2026-08-27',
        validUntil: '2026-09-26',
      },
      ZONE,
    )
    expect(payload.delegateCcgid).toBe('S00813982')
    expect(payload.validFrom).toBe('2026-08-26T18:30:00.000Z')
    expect(payload.validUntil).toBe('2026-09-26T18:29:59.000Z')
  })
})
