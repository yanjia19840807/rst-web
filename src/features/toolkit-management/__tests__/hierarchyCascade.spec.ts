import { describe, expect, it } from 'vitest'

import { cascadeHierarchy } from '../hierarchyCascade'
import type { HierarchyOption } from '../types'

function row(overrides: Partial<HierarchyOption>): HierarchyOption {
  return {
    supervisorPositionId: 'POS-1',
    center: 'GBS INDIA',
    domain: 'Ceva Logistics',
    pl1: 'Air & Ocean',
    pl2: 'Air Export',
    pl3Code: '1304',
    pl3Name: 'Agent Booking',
    ...overrides,
  }
}

const rows = [
  row({ pl1: 'Air & Ocean', pl2: 'Air Export', pl3Code: '1304', pl3Name: 'Agent Booking' }),
  row({ pl1: 'Air & Ocean', pl2: 'Air Import', pl3Code: '1319', pl3Name: 'Air Import Accruals' }),
  row({ pl1: 'Ocean Freight', pl2: 'Ocean Export', pl3Code: '1400', pl3Name: 'Ocean Export' }),
  row({ pl1: '', pl2: '', pl3Code: '1776', pl3Name: 'Air Import Registration' }),
  row({ pl1: '   ', pl2: '   ', pl3Code: '1777', pl3Name: 'Air Import Invoicing' }),
]

describe('cascadeHierarchy', () => {
  it('omits a blank PL1 and does not open PL2 until a PL1 is chosen', () => {
    const domainOnly = cascadeHierarchy(rows, {
      center: 'GBS INDIA',
      domain: 'Ceva Logistics',
      pl1: '',
      pl2: '',
    })

    expect(domainOnly.pl1s).toEqual(['Air & Ocean', 'Ocean Freight'])
    expect(domainOnly.pl2s).toEqual([])
    expect(domainOnly.pl3s).toEqual([])
  })

  it('loads only the PL2 values under the selected PL1', () => {
    const selected = cascadeHierarchy(rows, {
      center: 'GBS INDIA',
      domain: 'Ceva Logistics',
      pl1: 'Air & Ocean',
      pl2: '',
    })

    expect(selected.pl2s).toEqual(['Air Export', 'Air Import'])
    expect(selected.pl3s).toEqual([])
  })

  it('loads PL3 only after PL2 is chosen', () => {
    const selected = cascadeHierarchy(rows, {
      center: 'GBS INDIA',
      domain: 'Ceva Logistics',
      pl1: 'Air & Ocean',
      pl2: 'Air Export',
    })

    expect(selected.pl3s.map((item) => item.pl3Code)).toEqual(['1304'])
  })
})
