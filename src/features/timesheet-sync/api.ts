import { ApiError, apiHeaders, apiRequest } from '@/api/client'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

import type {
  TimesheetSnapshotAssignment,
  TimesheetSnapshotAssignmentsQuery,
  TimesheetSnapshotFilters,
  TimesheetSnapshotKpi,
  TimesheetSnapshotKpisQuery,
  TimesheetSnapshotPage,
  TimesheetSnapshotPeopleQuery,
  TimesheetSnapshotPerson,
  TimesheetSnapshotPosition,
  TimesheetSnapshotPositionsQuery,
  TimesheetSnapshotScope,
  TimesheetSnapshotScopesQuery,
  TimesheetSyncAlertConfig,
  TimesheetSyncOverview,
  TimesheetSyncOverviewQuery,
  TimesheetSyncRunDetail,
  TimesheetSyncRunHeader,
  TimesheetSyncRunIssuesQuery,
} from './types'

const base = '/api/v1/timesheet/sync'

export const timesheetSyncApi = {
  overview: (query: TimesheetSyncOverviewQuery) => {
    const params = new URLSearchParams()
    if (query.kind) params.set('kind', query.kind)
    if (query.status) params.set('status', query.status)
    if (query.dateFrom) params.set('dateFrom', query.dateFrom)
    if (query.dateTo) params.set('dateTo', query.dateTo)
    params.set('page', String(query.page))
    params.set('pageSize', String(query.pageSize))
    return apiRequest<TimesheetSyncOverview>(`${base}?${params.toString()}`)
  },
  run: (query: TimesheetSyncRunIssuesQuery) =>
    apiRequest<TimesheetSyncRunDetail>(
      `${base}/${query.id}?page=${query.page}&pageSize=${query.pageSize}`,
    ),
  alert: () => apiRequest<TimesheetSyncAlertConfig>(`${base}/alert`),
  saveAlert: (config: TimesheetSyncAlertConfig) =>
    apiRequest<TimesheetSyncAlertConfig>(`${base}/alert`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  upload: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(`${API_BASE_URL}${base}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: apiHeaders(undefined, { json: false }),
      body: form,
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null
      throw new ApiError(body?.detail || 'Timesheet upload failed.', response.status)
    }
    return response.json() as Promise<TimesheetSyncRunHeader>
  },
  tableFilters: () => apiRequest<TimesheetSnapshotFilters>(`${base}/tables/filters`),
  people: (query: TimesheetSnapshotPeopleQuery) =>
    apiRequest<TimesheetSnapshotPage<TimesheetSnapshotPerson>>(
      `${base}/tables/people?${snapshotParams(query)}`,
    ),
  positions: (query: TimesheetSnapshotPositionsQuery) =>
    apiRequest<TimesheetSnapshotPage<TimesheetSnapshotPosition>>(
      `${base}/tables/positions?${snapshotParams(query)}`,
    ),
  scopes: (query: TimesheetSnapshotScopesQuery) =>
    apiRequest<TimesheetSnapshotPage<TimesheetSnapshotScope>>(
      `${base}/tables/scopes?${snapshotParams(query)}`,
    ),
  assignments: (query: TimesheetSnapshotAssignmentsQuery) =>
    apiRequest<TimesheetSnapshotPage<TimesheetSnapshotAssignment>>(
      `${base}/tables/assignments?${snapshotParams(query)}`,
    ),
  kpis: (query: TimesheetSnapshotKpisQuery) =>
    apiRequest<TimesheetSnapshotPage<TimesheetSnapshotKpi>>(
      `${base}/tables/kpis?${snapshotParams(query)}`,
    ),
}

function snapshotParams(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === '') continue
    params.set(key, String(value))
  }
  return params.toString()
}
