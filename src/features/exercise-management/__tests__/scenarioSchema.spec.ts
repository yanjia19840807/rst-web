import { describe, expect, it } from 'vitest'

import {
  emptyScenarioForm,
  emptyShiftDraft,
  scenarioFormSchema,
  scenarioSlotSchema,
  toShiftRequests,
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
          weekendCode: '1',
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts duration hours provided as a numeric string', () => {
    const result = scenarioSlotSchema.safeParse({
      ...validForm(),
      shifts: [
        {
          shiftNo: 1,
          startTime: '09:00:00',
          durationHours: '3.00',
          headcount: '3',
          weekendCode: '1',
        },
      ],
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.shifts[0]?.durationHours).toBe(3)
    expect(result.data.shifts[0]?.headcount).toBe(3)
  })

  it('rejects a zero duration even when the row is otherwise filled', () => {
    const result = scenarioSlotSchema.safeParse({
      ...validForm(),
      shifts: [
        {
          shiftNo: 2,
          startTime: '10:30:00',
          durationHours: 0,
          headcount: 3,
          weekendCode: '1',
        },
      ],
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'shifts.0.durationHours')).toBe(
      true,
    )
  })

  it('rejects more than five shifts', () => {
    const shift = {
      shiftNo: 1,
      startTime: '08:00:00',
      durationHours: 8,
      headcount: 2,
      weekendCode: '1',
    }
    const result = scenarioFormSchema.safeParse({
      ...validForm(),
      shifts: Array.from({ length: 6 }, (_, index) => ({ ...shift, shiftNo: index + 1 })),
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'shifts')).toBe(true)
  })
})

describe('toShiftRequests', () => {
  it('converts hours to whole minutes for the API', () => {
    expect(
      toShiftRequests([
        {
          shiftNo: 1,
          startTime: '09:00',
          durationHours: 8,
          headcount: 4,
          weekendCode: '1',
        },
        {
          shiftNo: 2,
          startTime: '10:30:00',
          durationHours: 3,
          headcount: 3,
          weekendCode: '1',
        },
      ]),
    ).toEqual([
      {
        shiftNo: 1,
        startTime: '09:00:00',
        durationMinutes: 480,
        headcount: 4,
        weekendCode: '1',
      },
      {
        shiftNo: 2,
        startTime: '10:30:00',
        durationMinutes: 180,
        headcount: 3,
        weekendCode: '1',
      },
    ])
  })

  it('drops blank draft rows before sending', () => {
    expect(toShiftRequests([emptyShiftDraft(), emptyShiftDraft(2)])).toEqual([])
  })
})
