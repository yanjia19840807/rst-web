import { describe, expect, it } from 'vitest'

import { radarAxisScale, relativeToPeak, toChartNumber } from '../benchmarkingChartMath'

describe('relativeToPeak', () => {
  it('scales the largest absolute value to 100', () => {
    expect(relativeToPeak([11.4, 20, null])).toEqual([57, 100, null])
  })

  it('keeps negatives below zero', () => {
    expect(relativeToPeak([1.2, -0.6])).toEqual([100, -50])
  })

  it('keeps an all-zero set at zero', () => {
    expect(relativeToPeak([0, 0])).toEqual([0, 0])
  })
})

describe('radarAxisScale', () => {
  it('starts non-negative metrics at zero and pads the max', () => {
    expect(radarAxisScale([11.4, 20])).toEqual({ min: 0, max: 22 })
  })

  it('lets Capacity Creation start below zero', () => {
    expect(radarAxisScale([1.2, -0.6], { allowNegative: true })).toEqual({
      min: -0.66,
      max: 1.32,
    })
  })
})

describe('toChartNumber', () => {
  it('reads numeric strings and rejects blanks', () => {
    expect(toChartNumber('11.4')).toBe(11.4)
    expect(toChartNumber('')).toBeNull()
    expect(toChartNumber(null)).toBeNull()
  })
})
