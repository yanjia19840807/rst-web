import { describe, expect, it } from 'vitest'

import { composeClock, formatClock, hasClockValue } from '../clock'

describe('clock value', () => {
  it('treats midnight as a value', () => {
    expect(hasClockValue('00:00')).toBe(true)
    expect(hasClockValue('00:00:00')).toBe(true)
    expect(formatClock('00:00:00')).toBe('00:00')
    expect(composeClock('00', '00')).toBe('00:00:00')
  })

  it('treats a blank time as empty', () => {
    expect(hasClockValue('')).toBe(false)
    expect(hasClockValue(null)).toBe(false)
    expect(formatClock('')).toBe('—')
    expect(composeClock('', '00')).toBe('')
    expect(composeClock('00', '')).toBe('')
  })
})
