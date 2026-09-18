import { describe, expect, it } from 'vitest'

import { capacityEmphasize, capacityTone, parseSignedMetric } from '../hcFormat'

describe('capacityTone', () => {
  it('colors gains green and losses red', () => {
    expect(capacityTone(1.2)).toContain('text-emerald-600')
    expect(capacityTone(-0.4)).toContain('text-destructive')
    expect(capacityTone('+14.5%')).toContain('text-emerald-600')
    expect(capacityTone('-17.0%')).toContain('text-destructive')
  })

  it('leaves zero and empty as default', () => {
    expect(capacityTone(0)).toBe('')
    expect(capacityTone('0.00')).toBe('')
    expect(capacityTone(null)).toBe('')
    expect(capacityTone('')).toBe('')
  })
})

describe('capacityEmphasize', () => {
  it('maps signed values to card tones', () => {
    expect(capacityEmphasize(2)).toBe('good')
    expect(capacityEmphasize(-1)).toBe('bad')
    expect(capacityEmphasize(0)).toBeNull()
    expect(capacityEmphasize(null)).toBeNull()
  })
})

describe('parseSignedMetric', () => {
  it('reads formatted HC and percent strings', () => {
    expect(parseSignedMetric('+1.20')).toBe(1.2)
    expect(parseSignedMetric('-17.0%')).toBe(-17)
    expect(parseSignedMetric('—')).toBeNull()
  })
})
