import { http, HttpResponse } from 'msw'

import type { TimesheetSyncRunHeader } from '@/features/timesheet-sync/types'

const daily: TimesheetSyncRunHeader = {
  id: '11111111-1111-1111-1111-111111111111',
  kind: 'DAILY',
  status: 'ACTIVE',
  syncDate: '2026-07-27',
  attemptNo: 1,
  rowCount: 120,
  sourceType: 'SHAREPOINT',
  sourceFileName: 'Daily Report of 20260727(GBS CHINA).xlsx',
  sourceEtag: 'W/"etag-daily"',
  triggeredByCcgid: 'SYSTEM',
  errorCode: null,
  errorMessage: null,
  startedAt: '2026-08-28T06:00:00Z',
  completedAt: '2026-08-28T06:01:00Z',
}

const monthly: TimesheetSyncRunHeader = {
  ...daily,
  id: '22222222-2222-2222-2222-222222222222',
  kind: 'MONTHLY',
  syncDate: '2026-06-30',
  sourceFileName: 'Monthly Report of 202606(GBS CHINA).xlsx',
  rowCount: 80,
}

const extraRuns: TimesheetSyncRunHeader[] = Array.from({ length: 23 }, (_, index) => {
  const n = index + 1
  const day = String(27 - (n % 20)).padStart(2, '0')
  return {
    ...daily,
    id: `33333333-3333-3333-3333-${String(n).padStart(12, '0')}`,
    status: n % 5 === 0 ? 'FAILED' : 'ARCHIVED',
    syncDate: `2026-07-${day}`,
    sourceFileName: `Daily Report of 202607${day}(GBS CHINA).xlsx`,
    errorCode: n % 5 === 0 ? 'DATE_MISMATCH' : null,
    startedAt: `2026-08-${String(28 - (n % 10)).padStart(2, '0')}T06:00:00Z`,
    completedAt: `2026-08-${String(28 - (n % 10)).padStart(2, '0')}T06:01:00Z`,
  }
})

const allRuns = [daily, monthly, ...extraRuns]

let alertConfig = {
  enabled: false,
  recipients: [] as string[],
}

export const timesheetSyncHandlers = [
  http.get('*/api/v1/timesheet/sync/alert', () => HttpResponse.json(alertConfig)),
  http.put('*/api/v1/timesheet/sync/alert', async ({ request }) => {
    const body = (await request.json()) as { enabled?: boolean; recipients?: string[] }
    const recipients = Array.from(
      new Set(
        (body.recipients ?? [])
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    )
    alertConfig = { enabled: Boolean(body.enabled), recipients }
    return HttpResponse.json(alertConfig)
  }),
  http.get('*/api/v1/timesheet/sync', ({ request }) => {
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '10') || 10))
    const kind = url.searchParams.get('kind')?.trim().toUpperCase() || ''
    const status = url.searchParams.get('status')?.trim().toUpperCase() || ''
    const dateFrom = url.searchParams.get('dateFrom') || ''
    const dateTo = url.searchParams.get('dateTo') || ''
    const filtered = allRuns.filter((row) => {
      if (kind && row.kind !== kind) return false
      if (status && row.status !== status) return false
      if (dateFrom && row.syncDate < dateFrom) return false
      if (dateTo && row.syncDate > dateTo) return false
      return true
    })
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const from = (safePage - 1) * pageSize
    return HttpResponse.json({
      daily,
      monthly,
      runs: {
        items: filtered.slice(from, from + pageSize),
        page: safePage,
        pageSize,
        total,
        totalPages,
      },
    })
  }),
  http.get('*/api/v1/timesheet/sync/:id', ({ params }) =>
    HttpResponse.json({
      run: allRuns.find((row) => row.id === params.id) ?? daily,
      issues: [],
    }),
  ),
  http.post('*/api/v1/timesheet/sync', async () => {
    return HttpResponse.json(daily, { status: 200 })
  }),
]
