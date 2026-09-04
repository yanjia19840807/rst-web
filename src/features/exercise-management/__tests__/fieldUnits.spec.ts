import { describe, expect, it } from 'vitest'

import { FieldUnit, withUnit } from '../fieldUnits'

describe('withUnit', () => {
  it('appends the unit in parentheses', () => {
    expect(withUnit('SLA turntime', FieldUnit.hours)).toBe('SLA turntime (hours)')
    expect(withUnit('Median Cycle Time', FieldUnit.seconds)).toBe('Median Cycle Time (s)')
  })

  it('does not duplicate an existing unit suffix', () => {
    expect(withUnit('SLA target (%)', FieldUnit.percent)).toBe('SLA target (%)')
  })
})
