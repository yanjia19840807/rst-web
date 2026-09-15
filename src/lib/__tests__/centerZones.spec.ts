import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { writeCenterCatalog } from '@/catalog/centerCatalog'

import { resolveContextTimeZone, zoneIdForCenter } from '../centerZones'

const CATALOG = [
  { center: 'GBS CHINA', timeZone: 'Asia/Shanghai' },
  { center: 'GBS INDIA', timeZone: 'Asia/Kolkata' },
  { center: 'GBS PORTUGAL', timeZone: 'Europe/Lisbon' },
]

describe('centerZones', () => {
  beforeEach(() => {
    writeCenterCatalog(CATALOG)
  })

  afterEach(() => {
    writeCenterCatalog([])
  })

  it('maps canonical Centers to IANA zones', () => {
    expect(zoneIdForCenter('GBS CHINA')).toBe('Asia/Shanghai')
    expect(zoneIdForCenter('GBS INDIA')).toBe('Asia/Kolkata')
    expect(zoneIdForCenter('gbs portugal')).toBe('Europe/Lisbon')
  })

  it('rejects unknown Centers', () => {
    expect(() => zoneIdForCenter('GBS UNKNOWN')).toThrow(/GBS UNKNOWN/)
  })

  it('uses the catalog default when HO has no identity Center', () => {
    expect(resolveContextTimeZone(null)).toBe('Asia/Shanghai')
  })

  it('does not invent a browser zone when the catalog is empty', () => {
    writeCenterCatalog([])
    expect(() => resolveContextTimeZone(null)).toThrow(/not loaded/)
  })
})
