import { describe, expect, it } from 'vitest'

import { cycleTime, cycleTimeVolume } from '../tmsSessionColumns'

describe('cycleTime', () => {
  it('treats empty volume as 1', () => {
    expect(cycleTimeVolume(null)).toBe(1)
    expect(cycleTimeVolume(0)).toBe(1)
    expect(cycleTime({ id: '1', startedAt: '', netDurationSeconds: 120, processedVolume: null })).toBe(
      '120s',
    )
  })

  it('divides net duration by a positive volume', () => {
    expect(
      cycleTime({ id: '1', startedAt: '', netDurationSeconds: 120, processedVolume: 2 }),
    ).toBe('60s')
  })
})
