import { describe, expect, it } from 'vitest'

import {
  emptyTeamSetupForm,
  headcountAlignment,
  roundHc1,
  slaHoursToMinutes,
  slaMinutesToHours,
  teamSetupFormSchema,
  toTeamSetupRequest,
} from '../schemas/teamSetup'

describe('teamSetupFormSchema', () => {
  it('accepts an empty draft', () => {
    expect(teamSetupFormSchema.safeParse(emptyTeamSetupForm()).success).toBe(true)
  })

  it('rejects negative headcount', () => {
    const result = teamSetupFormSchema.safeParse({
      ...emptyTeamSetupForm(),
      agentsLt6m: -1,
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'agentsLt6m')).toBe(true)
  })

  it('rejects a ratio above 100%', () => {
    const result = teamSetupFormSchema.safeParse({
      ...emptyTeamSetupForm(),
      availabilityRatio: 1.2,
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'availabilityRatio')).toBe(
      true,
    )
  })

  it('keeps midnight as an SLA clock value', () => {
    const result = teamSetupFormSchema.safeParse({
      ...emptyTeamSetupForm(),
      slaStartTime: '00:00',
      slaEndTime: '08:00',
    })
    expect(result.success).toBe(true)
    expect(
      toTeamSetupRequest({
        ...emptyTeamSetupForm(),
        slaStartTime: '00:00',
        slaEndTime: '08:00',
      }),
    ).toMatchObject({
      slaStartTime: '00:00',
      slaEndTime: '08:00',
    })
  })

  it('requires both SLA clock times when one is set', () => {
    const result = teamSetupFormSchema.safeParse({
      ...emptyTeamSetupForm(),
      slaStartTime: '08:00',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'slaEndTime')).toBe(true)
  })

  it('converts SLA turntime between hours and minutes', () => {
    expect(slaMinutesToHours(480)).toBe(8)
    expect(slaHoursToMinutes(8)).toBe(480)
    expect(
      toTeamSetupRequest({ ...emptyTeamSetupForm(), slaTurnaroundHours: 8 }).slaTurnaroundMinutes,
    ).toBe(480)
  })

  it('accepts a complete working draft', () => {
    const result = teamSetupFormSchema.safeParse({
      ...emptyTeamSetupForm(),
      agentsGt48m: 10,
      slaType: 'BUSINESS_HOURS',
      slaStartTime: '08:00',
      slaEndTime: '17:00',
      availabilityRatio: 0.85,
      slaTargetRatio: 0.9,
    })
    expect(result.success).toBe(true)
  })
})

describe('headcountAlignment', () => {
  it('rounds half-up to one decimal', () => {
    expect(roundHc1(12.14)).toBe(12.1)
    expect(roundHc1(12.15)).toBe(12.2)
    expect(roundHc1(12.36)).toBe(12.4)
  })

  it('matches when tenure total and Delivery HC round to the same tenth', () => {
    expect(headcountAlignment([12.36], 12.41).matches).toBe(true)
    expect(headcountAlignment([6.1, 6.26], 12.36).matches).toBe(true)
  })

  it('treats empty tenure buckets as zero', () => {
    expect(headcountAlignment([null, null, null, null], 0).matches).toBe(true)
    expect(headcountAlignment([null, null, null, null], 12.1).matches).toBe(false)
  })

  it('reports a mismatch at one decimal', () => {
    const check = headcountAlignment([12.36], 12.14)
    expect(check.matches).toBe(false)
    expect(check.tenureRounded).toBe(12.4)
    expect(check.deliveryRounded).toBe(12.1)
  })
})
