import { afterEach, describe, expect, it } from 'vitest'

import { writeCenterCatalog } from '@/catalog/centerCatalog'

import { formatCivilDateTime, formatInstant, formatInstantForCenter, formatToday } from '../datetime'

describe('formatInstant', () => {
  it('converts a UTC instant into the Center calendar', () => {
    expect(formatInstant('2026-03-15T18:30:00Z', 'Asia/Kolkata', { zoneLabel: false })).toBe(
      '2026-03-16 00:00',
    )
    expect(formatInstant('2026-03-15T18:30:00Z', 'Europe/Lisbon', { zoneLabel: false })).toBe(
      '2026-03-15 18:30',
    )
  })

  it('appends a timezone abbreviation for mixed HO lists', () => {
    expect(formatInstant('2026-03-15T18:30:00Z', 'Asia/Kolkata')).toMatch(
      /^2026-03-16 00:00 \S+$/,
    )
  })
})

describe('formatCivilDateTime', () => {
  it('keeps slot wall-clock digits in any runtime timezone', () => {
    expect(formatCivilDateTime('2026-03-15T08:00:00')).toBe('2026-03-15 08:00')
  })
})

describe('formatToday', () => {
  it('returns an ISO civil date', () => {
    expect(formatToday('Asia/Kolkata')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatInstantForCenter', () => {
  afterEach(() => {
    writeCenterCatalog([])
  })

  it('uses the catalog zone for a known Center', () => {
    writeCenterCatalog([{ center: 'GBS INDIA', timeZone: 'Asia/Kolkata' }])
    expect(formatInstantForCenter('2026-03-15T18:30:00Z', 'GBS INDIA', { zoneLabel: false })).toBe(
      '2026-03-16 00:00',
    )
  })

  it('does not fall back to the browser zone when the catalog is empty', () => {
    writeCenterCatalog([])
    expect(formatInstantForCenter('2026-03-15T18:30:00Z', 'GBS INDIA')).toBe('—')
  })
})
