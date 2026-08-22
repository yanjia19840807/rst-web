import { describe, expect, it } from 'vitest'

import { emptyTeamSetupForm, teamSetupFormSchema } from '../schemas/teamSetup'

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

  it('requires both SLA clock times when one is set', () => {
    const result = teamSetupFormSchema.safeParse({
      ...emptyTeamSetupForm(),
      slaStartTime: '08:00',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'slaEndTime')).toBe(true)
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
