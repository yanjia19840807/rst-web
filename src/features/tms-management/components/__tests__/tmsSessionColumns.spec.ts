import { describe, expect, it } from 'vitest'

import { cycleTime, cycleTimeVolume, formatSessionVolume } from '../tmsSessionColumns'

describe('cycleTime', () => {
  it('does not invent a volume when it is missing', () => {
    expect(cycleTimeVolume(null)).toBeNull()
    expect(cycleTimeVolume(0)).toBeNull()
    expect(cycleTime({ id: '1', startedAt: '', netDurationSeconds: 120, processedVolume: null })).toBe(
      '—',
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
