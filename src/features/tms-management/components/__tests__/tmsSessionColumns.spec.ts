import { describe, expect, it } from 'vitest'

import { cycleTime, cycleTimeVolume, formatSessionVolume } from '../tmsSessionColumns'

describe('cycleTime', () => {
  it('treats empty volume as 1', () => {
    expect(cycleTimeVolume(null)).toBe(1)
    expect(cycleTimeVolume(0)).toBe(1)
    expect(cycleTime({ id: '1', startedAt: '', netDurationSeconds: 120, processedVolume: null })).toBe(
      '120s',
    )
  })

  it('renders volume without decimals', () => {
    expect(formatSessionVolume(12)).toBe('12')
    expect(formatSessionVolume(null)).toBe('—')
  })

  it('divides net duration by a positive volume', () => {
    expect(
      cycleTime({ id: '1', startedAt: '', netDurationSeconds: 120, processedVolume: 2 }),
    ).toBe('60s')
  })
})
