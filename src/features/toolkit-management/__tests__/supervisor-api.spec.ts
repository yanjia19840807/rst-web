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
    const toolkit = (await toolkitApi.list()).items.find((item) => !item.outOfSync)
    expect(toolkit).toBeDefined()

    const result = await exerciseApi.create({
      toolkitId: toolkit!.id,
      sizingMonth: '2026-09',
      tmsFrom: '2026-08-01',
      tmsTo: '2026-08-31',
    })

    expect(result.exercise.slotStartDate).toBeNull()
    expect(result.exercise.slotWeeks).toBeNull()

    expect(result.exercise.snapshot.toolkit.version).toBe(toolkit!.version)
    expect(result.exercise.snapshot.subtasks.every((item) => item.deletedAt === null)).toBe(true)
    expect(result.exercise.snapshot.sharedKpis.every((item) => item.valid)).toBe(true)
    expect(result.notices.length).toBeGreaterThan(0)
  })

  it('marks a Toolkit out of sync when a Shared KPI line left Monthly', async () => {
    const all = await toolkitApi.list()
    const invoice = all.items.find((item) => item.pl3Code === 'PL3-INVOICE')

    expect(invoice?.outOfSync).toBe(true)
    expect(invoice?.alignment?.structuralDrift).toBe(true)
    expect(invoice?.alignment?.lines.some((line) => line.missing)).toBe(true)

    const bank = all.items.find((item) => item.pl3Code === 'PL3-BANK-REC')
    expect(bank?.outOfSync).toBe(false)
  })

  it('filters supervisor toolkits by name on the server', async () => {
    const all = await toolkitApi.list()
    expect(all.items.length).toBeGreaterThan(0)
    expect(all.pl3Names).toContain('Bank Reconciliation')

    const matched = await toolkitApi.list({ name: 'Bank' })
    expect(matched.items.every((item) => item.name.includes('Bank'))).toBe(true)

    const missed = await toolkitApi.list({ name: 'does-not-exist' })
    expect(missed.items).toHaveLength(0)
    expect(missed.pl3Names).toEqual(all.pl3Names)
  })
})
