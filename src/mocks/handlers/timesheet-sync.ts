import { http, HttpResponse } from 'msw'

import type { TimesheetSyncRunHeader } from '@/features/timesheet-sync/types'

const daily: TimesheetSyncRunHeader = {
  id: '11111111-1111-1111-1111-111111111111',
  kind: 'DAILY',
  status: 'ACTIVE',
  syncDate: '2026-07-27',
  center: 'GBS CHINA',
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

function matchesPosition(id: string | null | undefined, name: string | null | undefined, q: string) {
  if (!q) return true
  return (id ?? '').toLowerCase().includes(q) || (name ?? '').toLowerCase().includes(q)
}

function pageOf<T>(items: T[], request: Request) {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '10') || 10))
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const filtered = q
    ? items.filter((item) => JSON.stringify(item).toLowerCase().includes(q))
    : items
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const from = (safePage - 1) * pageSize
  return {
    items: filtered.slice(from, from + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  }
}

const mockPeople = [
  {
    ccgid: 'S00000001',
    empId: 'EMP-1',
    name: 'Agent One',
    email: 's00000001@dev.local',
    center: 'GBS CHINA',
    positionId: 'EMP-POS-1',
  },
  {
    ccgid: 'S00000005',
    empId: 'EMP-2',
    name: 'Agent Two',
    email: 's00000005@dev.local',
    center: 'Kuala Lumpur',
    positionId: 'EMP-POS-2',
  },
]

const mockPositions = [
  {
    agentPositionId: 'EMP-POS-1',
    agentName: 'Agent One',
    supervisorPositionId: 'POS-SUP-1',
    supervisorName: 'Supervisor One',
    srManagerPositionId: 'POS-SRM-1',
    srManagerName: 'SR Manager One',
    center: 'GBS CHINA',
  },
  {
    agentPositionId: 'EMP-POS-2',
    agentName: 'Agent Two',
    supervisorPositionId: 'POS-SUP-1',
    supervisorName: 'Supervisor One',
    srManagerPositionId: 'POS-SRM-1',
    srManagerName: 'SR Manager One',
    center: 'Kuala Lumpur',
  },
]

const mockScopes = [
  {
    supervisorPositionId: 'POS-SUP-1',
    supervisorName: 'Supervisor One',
    center: 'GBS CHINA',
    domain: 'Finance',
    pl1: 'PL1',
    pl2: 'PL2',
    pl3Code: 'PL3',
    pl3Name: 'PL3 Name',
  },
]

const mockAssignments = [
  {
    agentPositionId: 'EMP-POS-1',
    agentName: 'Agent One',
    supervisorPositionId: 'POS-SUP-1',
    supervisorName: 'Supervisor One',
    pl3Code: 'PL3',
    pl3Name: 'PL3 Name',
    center: 'GBS CHINA',
  },
  {
    agentPositionId: 'EMP-POS-2',
    agentName: 'Agent Two',
    supervisorPositionId: 'POS-SUP-1',
    supervisorName: 'Supervisor One',
    pl3Code: 'PL3',
    pl3Name: 'PL3 Name',
    center: 'Kuala Lumpur',
  },
]

const mockKpis = [
  {
    supervisorPositionId: 'POS-SUP-1',
    supervisorName: 'Supervisor One',
    center: 'GBS CHINA',
    pl3Code: 'PL3',
    pl3Name: 'PL3 Name',
    carrier: 'CMA',
    site: 'Site A',
    customerCountry: 'MY',
    hc: '2.000000',
  },
]

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
  http.get('*/api/v1/timesheet/sync/tables/filters', () =>
    HttpResponse.json({
      peopleCenters: ['GBS CHINA', 'Kuala Lumpur'],
      scopeCenters: ['GBS CHINA'],
      scopeDomains: ['Finance'],
    }),
  ),
  http.get('*/api/v1/timesheet/sync/tables/people', ({ request }) => {
    const url = new URL(request.url)
    const center = url.searchParams.get('center') ?? ''
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const rows = mockPeople.filter(
      (row) =>
        (!center || row.center === center) &&
        (!q ||
          row.name.toLowerCase().includes(q) ||
          row.ccgid.toLowerCase().includes(q) ||
          row.empId.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.positionId.toLowerCase().includes(q)),
    )
    return HttpResponse.json(pageOf(rows, request))
  }),
  http.get('*/api/v1/timesheet/sync/tables/positions', ({ request }) => {
    const url = new URL(request.url)
    const center = url.searchParams.get('center') ?? ''
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const rows = mockPositions.filter(
      (row) =>
        (!center || row.center === center) &&
        (!q
          || matchesPosition(row.agentPositionId, row.agentName, q)
          || matchesPosition(row.supervisorPositionId, row.supervisorName, q)
          || matchesPosition(row.srManagerPositionId, row.srManagerName, q)),
    )
    return HttpResponse.json(pageOf(rows, request))
  }),
  http.get('*/api/v1/timesheet/sync/tables/scopes', ({ request }) => {
    const url = new URL(request.url)
    const center = url.searchParams.get('center') ?? ''
    const supervisor = (url.searchParams.get('supervisor') ?? '').toLowerCase()
    const pl3Code = (url.searchParams.get('pl3Code') ?? '').toLowerCase()
    const rows = mockScopes.filter(
      (row) =>
        (!center || row.center === center) &&
        matchesPosition(row.supervisorPositionId, row.supervisorName, supervisor) &&
        (!pl3Code
          || row.pl3Code.toLowerCase().includes(pl3Code)
          || (row.pl3Name ?? '').toLowerCase().includes(pl3Code)),
    )
    return HttpResponse.json(pageOf(rows, request))
  }),
  http.get('*/api/v1/timesheet/sync/tables/assignments', ({ request }) => {
    const url = new URL(request.url)
    const center = url.searchParams.get('center') ?? ''
    const agent = (url.searchParams.get('agent') ?? '').toLowerCase()
    const supervisor = (url.searchParams.get('supervisor') ?? '').toLowerCase()
    const pl3Code = (url.searchParams.get('pl3Code') ?? '').toLowerCase()
    const rows = mockAssignments.filter(
      (row) =>
        (!center || row.center === center) &&
        matchesPosition(row.agentPositionId, row.agentName, agent) &&
        matchesPosition(row.supervisorPositionId, row.supervisorName, supervisor) &&
        (!pl3Code
          || row.pl3Code.toLowerCase().includes(pl3Code)
          || (row.pl3Name ?? '').toLowerCase().includes(pl3Code)),
    )
    return HttpResponse.json(pageOf(rows, request))
  }),
  http.get('*/api/v1/timesheet/sync/tables/kpis', ({ request }) => {
    const url = new URL(request.url)
    const center = url.searchParams.get('center') ?? ''
    const supervisor = (url.searchParams.get('supervisor') ?? '').toLowerCase()
    const pl3Code = (url.searchParams.get('pl3Code') ?? '').toLowerCase()
    const rows = mockKpis.filter(
      (row) =>
        (!center || row.center === center) &&
        matchesPosition(row.supervisorPositionId, row.supervisorName, supervisor) &&
        (!pl3Code
          || row.pl3Code.toLowerCase().includes(pl3Code)
          || (row.pl3Name ?? '').toLowerCase().includes(pl3Code)),
    )
    return HttpResponse.json(pageOf(rows, request))
  }),
  http.get('*/api/v1/timesheet/sync/:id', ({ params, request }) => {
    const run = allRuns.find((row) => row.id === params.id) ?? daily
    const issues =
      run.status === 'FAILED'
        ? [
            {
              id: `${run.id}-issue-1`,
              code: run.errorCode || 'FAILED',
              message: run.errorMessage || 'Timesheet sync failed.',
              empCcgid: null,
              positionId: null,
              pl3Code: null,
              sourceRow: 2,
            },
          ]
        : []
    return HttpResponse.json({
      run,
      issues: pageOf(issues, request),
    })
  }),
  http.post('*/api/v1/timesheet/sync', async () => {
    return HttpResponse.json(daily, { status: 200 })
  }),
]
