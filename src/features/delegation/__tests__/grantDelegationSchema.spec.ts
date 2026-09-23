import { parseDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'

import { formatToday } from '@/lib/datetime'

import {
  assignCoverageSchema,
  emptyAssignCoverageForm,
  emptyGrantDelegationForm,
  grantDelegationSchema,
  toAssignCoverageRequest,
  toCreateDelegationRequest,
} from '../schemas/grantDelegation'

const ZONE = 'Asia/Kolkata'

function addDays(date: string, days: number) {
  return parseDate(date).add({ days }).toString()
}

function validGrant() {
  const today = formatToday(ZONE)
  return {
    delegateCcgids: ['S00813982'],
    validFrom: today,
    validUntil: addDays(today, 30),
  }
}

describe('grantDelegationSchema', () => {
  const schema = grantDelegationSchema(ZONE)

  it('accepts a complete grant payload', () => {
    expect(schema.safeParse(validGrant()).success).toBe(true)
  })

  it('rejects selecting yourself', () => {
    const result = grantDelegationSchema(ZONE, 'S00813982').safeParse(validGrant())
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path[0] === 'delegateCcgids')).toBe(true)
  })

  it('requires a delegate', () => {
    const result = schema.safeParse({
      ...validGrant(),
      delegateCcgids: [],
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path[0] === 'delegateCcgids')).toBe(
      true,
    )
  })

  it('treats blank dates as ongoing access', () => {
    expect(
      schema.safeParse({
        ...emptyGrantDelegationForm(),
        delegateCcgids: ['S00813982'],
      }).success,
    ).toBe(true)
  })

  it('requires end date on or after start date', () => {
    const today = formatToday(ZONE)
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
    const today = formatToday(ZONE)
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
    const today = formatToday(ZONE)
    expect(
      schema.safeParse({
        ...validGrant(),
        validFrom: today,
        validUntil: today,
      }).success,
    ).toBe(true)
  })
})

describe('assignCoverageSchema', () => {
  const schema = assignCoverageSchema(ZONE)

  it('rejects the current occupant and allows someone else', () => {
    const schema = assignCoverageSchema(ZONE, { '173008': 'S00580242' })
    const occupant = schema.safeParse({
      positionId: '173008',
      delegateCcgids: ['S00580242'],
      validFrom: '',
      validUntil: '',
    })
    expect(occupant.success).toBe(false)
    const other = schema.safeParse({
      positionId: '173008',
      delegateCcgids: ['S00813982'],
      validFrom: '',
      validUntil: '',
    })
    expect(other.success).toBe(true)
  })

  it('requires a position and at least one delegate', () => {
    const result = schema.safeParse(emptyAssignCoverageForm())
    expect(result.success).toBe(false)
    if (result.success) return
    const paths = result.error.issues.map((issue) => issue.path[0])
    expect(paths).toContain('positionId')
    expect(paths).toContain('delegateCcgids')
  })

  it('converts a complete assignment to UTC instants', () => {
    const payload = toAssignCoverageRequest(
      {
        positionId: '173008',
        delegateCcgids: ['S00813982'],
        validFrom: '2026-08-27',
        validUntil: '2026-09-26',
      },
      ZONE,
    )
    expect(payload.positionId).toBe('173008')
    expect(payload.delegateCcgids).toEqual(['S00813982'])
    expect(payload.validFrom).toBe('2026-08-26T18:30:00.000Z')
    expect(payload.validUntil).toBe('2026-09-26T18:29:59.000Z')
  })
})

describe('toCreateDelegationRequest', () => {
  it('converts Center wall-clock day bounds to UTC instants', () => {
    const payload = toCreateDelegationRequest(
      {
        delegateCcgids: ['S00813982'],
        validFrom: '2026-08-27',
        validUntil: '2026-09-26',
      },
      ZONE,
    )
    expect(payload.delegateCcgids).toEqual(['S00813982'])
    expect(payload.validFrom).toBe('2026-08-26T18:30:00.000Z')
    expect(payload.validUntil).toBe('2026-09-26T18:29:59.000Z')
  })

  it('omits blank dates', () => {
    const payload = toCreateDelegationRequest(
      {
        delegateCcgids: ['S00813982'],
        validFrom: '',
        validUntil: '',
      },
      ZONE,
    )
    expect(payload.validFrom).toBeNull()
    expect(payload.validUntil).toBeNull()
  })
})
