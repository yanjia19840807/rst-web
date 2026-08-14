import { apiRequest } from '@/api/client'

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

const supervisorToolkits = '/api/v1/supervisor/toolkits'

export const toolkitApi = {
  list: (query?: ToolkitListQuery) => {
    const params = new URLSearchParams()
    const name = query?.name?.trim()
    if (name) params.set('name', name)
    if (query?.pl3Name) params.set('pl3Name', query.pl3Name)
    const search = params.toString()
    return apiRequest<ToolkitListView>(
      search ? `${supervisorToolkits}?${search}` : supervisorToolkits,
    )
  },
  get: (id: string) => apiRequest<SupervisorToolkit>(`${supervisorToolkits}/${id}`),
  hierarchy: () => apiRequest<HierarchyOption[]>('/api/v1/timesheet/toolkit-hierarchy'),
  candidates: (pl3Code: string, supervisorPositionId: string, countries: string[]) => {
    const params = new URLSearchParams({ pl3Code, supervisorPositionId })
    countries.forEach((country) => params.append('customerCountry', country))
    return apiRequest<SharedKpiResponse>(
      `/api/v1/timesheet/shared-kpi-candidates?${params.toString()}`,
    )
  },
  create: (input: ToolkitEditorPayload) =>
    apiRequest<SupervisorToolkit>(supervisorToolkits, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: ToolkitEditorPayload) =>
    apiRequest<SupervisorToolkit>(`${supervisorToolkits}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    apiRequest<void>(`${supervisorToolkits}/${id}`, { method: 'DELETE' }),
}
