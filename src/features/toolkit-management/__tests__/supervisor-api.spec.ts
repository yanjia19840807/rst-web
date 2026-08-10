import { describe, expect, it } from 'vitest'

import { exerciseApi } from '@/features/exercise-management/api'

import { toolkitApi } from '../api'

describe('supervisor mock contract', () => {
  it('derives KPI candidates and HC from ACTIVE Timesheet', async () => {
    const result = await toolkitApi.candidates('PL3-BANK-REC', 'POS-SUP-001', ['Australia'])

    expect(result.syncDate).toBe('2026-08-05')
    expect(result.items).toHaveLength(2)
    expect(result.items.every((item) => item.customerCountry === 'Australia')).toBe(true)
    expect(result.items[0]?.deliveryHc).toBeGreaterThan(0)
  })

  it('creates an Exercise with an immutable frozen snapshot', async () => {
    const [toolkit] = await toolkitApi.list()
    expect(toolkit).toBeDefined()

    const result = await exerciseApi.create({
      toolkitId: toolkit!.id,
      sizingMonth: '2026-09',
      slotStartDate: '2026-09-01',
      slotWeeks: 4,
      tmsFrom: '2026-08-01',
      tmsTo: '2026-08-31',
    })

    expect(result.exercise.snapshot.toolkit.version).toBe(toolkit!.version)
    expect(result.exercise.snapshot.subtasks.every((item) => item.deletedAt === null)).toBe(true)
    expect(result.exercise.snapshot.sharedKpis.every((item) => item.valid)).toBe(true)
    expect(result.notices.length).toBeGreaterThan(0)
  })
})
