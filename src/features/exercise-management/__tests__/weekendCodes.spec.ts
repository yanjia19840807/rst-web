import { describe, expect, it } from 'vitest'

import { countHolidayTypes } from '../weekendCodes'

describe('countHolidayTypes', () => {
  it('splits rest days from makeup days', () => {
    expect(
      countHolidayTypes([
        { holidayType: 'HOLIDAY' },
        { holidayType: 'WEEKEND' },
        { holidayType: 'NORMAL' },
        { holidayType: 'holiday' },
      ]),
    ).toEqual({ rest: 3, makeup: 1, total: 4 })
  })

  it('treats an empty list as zeros', () => {
    expect(countHolidayTypes([])).toEqual({ rest: 0, makeup: 0, total: 0 })
  })
})
