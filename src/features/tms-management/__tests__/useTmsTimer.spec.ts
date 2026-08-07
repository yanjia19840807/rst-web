import { describe, expect, it } from 'vitest'

import { formatDuration } from '../composables/useTmsTimer'

describe('formatDuration', () => {
  it('formats elapsed seconds as an hours clock', () => {
    expect(formatDuration(0)).toBe('00:00:00')
    expect(formatDuration(65)).toBe('00:01:05')
    expect(formatDuration(3661)).toBe('01:01:01')
  })
})
