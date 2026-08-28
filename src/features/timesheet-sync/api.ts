import { ApiError, apiRequest } from '@/api/client'
import { DELEGATION_HEADER, readDelegationId } from '@/auth/delegation'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

import type {
  TimesheetSyncAlertConfig,
  TimesheetSyncOverview,
  TimesheetSyncOverviewQuery,
  TimesheetSyncRunDetail,
  TimesheetSyncRunHeader,
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
  run: (id: string) => apiRequest<TimesheetSyncRunDetail>(`${base}/${id}`),
  alert: () => apiRequest<TimesheetSyncAlertConfig>(`${base}/alert`),
  saveAlert: (config: TimesheetSyncAlertConfig) =>
    apiRequest<TimesheetSyncAlertConfig>(`${base}/alert`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  upload: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const delegationId = readDelegationId()
    const response = await fetch(`${API_BASE_URL}${base}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: delegationId ? { [DELEGATION_HEADER]: delegationId } : undefined,
      body: form,
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null
      throw new ApiError(body?.detail || 'Timesheet upload failed.', response.status)
    }
    return response.json() as Promise<TimesheetSyncRunHeader>
  },
}
