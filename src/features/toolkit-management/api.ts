import { ApiError, apiHeaders, apiRequest } from '@/api/client'

import type {
  HierarchyOption,
  SharedKpiCandidate,
  SupervisorToolkit,
  ToolkitEditorPayload,
  ToolkitListQuery,
  ToolkitListView,
} from './types'

export interface SharedKpiResponse {
  syncDate: string
  customerCountries: string[]
  items: SharedKpiCandidate[]
}

const toolkits = '/api/v1/toolkits'

export const toolkitApi = {
  list: (query?: ToolkitListQuery) => {
    const params = new URLSearchParams()
    const name = query?.name?.trim()
    if (name) params.set('name', name)
    if (query?.pl3Name) params.set('pl3Name', query.pl3Name)
    params.set('page', String(query?.page ?? 1))
    params.set('pageSize', String(query?.pageSize ?? 10))
    return apiRequest<ToolkitListView>(`${toolkits}/managed?${params.toString()}`)
  },
  get: (id: string) => apiRequest<SupervisorToolkit>(`${toolkits}/${id}`),
  hierarchy: () => apiRequest<HierarchyOption[]>('/api/v1/timesheet/toolkit-hierarchy'),
  candidates: (pl3Code: string, supervisorPositionId: string, countries: string[]) => {
    const params = new URLSearchParams({ pl3Code, supervisorPositionId })
    countries.forEach((country) => params.append('customerCountry', country))
    return apiRequest<SharedKpiResponse>(
      `/api/v1/timesheet/shared-kpi-candidates?${params.toString()}`,
    )
  },
  create: (input: ToolkitEditorPayload) =>
    apiRequest<SupervisorToolkit>(toolkits, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: ToolkitEditorPayload) =>
    apiRequest<SupervisorToolkit>(`${toolkits}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    apiRequest<void>(`${toolkits}/${id}`, { method: 'DELETE' }),
  exportWorkbook: async (id: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}${toolkits}/${id}/export`, {
      headers: apiHeaders(undefined, { json: false }),
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null
      throw new ApiError(body?.detail || 'Export failed.', response.status)
    }
    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition') || ''
    const match = /filename="?([^"]+)"?/.exec(disposition)
    return { blob, filename: match?.[1] || 'toolkit-export.xlsx' }
  },
}
