import { describe, expect, it } from 'vitest'

import { chartColors } from '../chartTheme'

describe('chartColors', () => {
  it('uses light navy series colors that stay visible on a white card', () => {
    const colors = chartColors('light')
    expect(colors.volume).toBe('#071d49')
    expect(colors.axis).toBe('#14233a')
    expect(colors.border).toBe('#d4dde9')
  })

  it('uses light series colors ECharts can paint on a dark card', () => {
    const colors = chartColors('dark')
    expect(colors.volume).toBe('#90b8e7')
    expect(colors.axis).toBe('#f3f6fa')
    expect(colors.border).toBe('rgba(255, 255, 255, 0.12)')
    expect(colors.theoretical).toBe('#f3f6fa')
    expect(colors.daily).toBe('#f3f6fa')
  })
})
