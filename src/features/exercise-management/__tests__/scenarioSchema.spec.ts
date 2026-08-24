import { describe, expect, it } from 'vitest'

import {
  emptyScenarioForm,
  emptyShiftDraft,
  scenarioFormSchema,
  scenarioSlotSchema,
} from '../schemas/scenario'

function validForm() {
  return {
    name: 'Peak season',
    description: '',
    rightSizingHc: 12,
    shifts: [emptyShiftDraft()],
  }
}

describe('scenarioFormSchema', () => {
  it('accepts a named scenario with blank shifts', () => {
    expect(scenarioFormSchema.safeParse(validForm()).success).toBe(true)
  })

  it('requires a name', () => {
    const result = scenarioFormSchema.safeParse({ ...validForm(), name: '  ' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'name')).toBe(true)
  })

  it('rejects a filled shift missing start time', () => {
    const result = scenarioFormSchema.safeParse({
      ...validForm(),
      shifts: [{ ...emptyShiftDraft(), durationHours: 8, headcount: 2 }],
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'shifts.0.startTime')).toBe(
      true,
    )
  })
})

describe('scenarioSlotSchema', () => {
  it('marks empty default shift fields instead of asking to add a shift', () => {
    const blank = scenarioSlotSchema.safeParse(emptyScenarioForm())
    expect(blank.success).toBe(false)
    if (blank.success) return
    const paths = blank.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('shifts.0.startTime')
    expect(paths).toContain('shifts.0.durationHours')
    expect(paths).toContain('shifts.0.headcount')
    expect(paths).not.toContain('shifts')
  })

  it('accepts one complete shift', () => {
    const result = scenarioSlotSchema.safeParse({
      ...validForm(),
      shifts: [
        {
          shiftNo: 1,
          startTime: '08:00:00',
          durationHours: 8,
          headcount: 2,
          worksOnWeekend: false,
        },
      ],
    })
    expect(result.success).toBe(true)
  })
})
