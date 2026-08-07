import { apiRequest } from '@/api/client'

import type {
  HierarchyOption,
  SharedKpiCandidate,
  SupervisorToolkit,
  ToolkitEditorPayload,
} from './types'

export interface SharedKpiResponse {
  syncDate: string
  customerCountries: string[]
  items: SharedKpiCandidate[]
}

export const toolkitApi = {
  list: () => apiRequest<SupervisorToolkit[]>('/api/v1/supervisor/toolkits'),
  hierarchy: () => apiRequest<HierarchyOption[]>('/api/v1/timesheet/toolkit-hierarchy'),
  candidates: (pl3Code: string, supervisorPositionId: string, countries: string[]) => {
    const params = new URLSearchParams({ pl3Code, supervisorPositionId })
    countries.forEach((country) => params.append('customerCountry', country))
    return apiRequest<SharedKpiResponse>(
      `/api/v1/timesheet/shared-kpi-candidates?${params.toString()}`,
    )
  },
  create: (input: ToolkitEditorPayload) =>
    apiRequest<SupervisorToolkit>('/api/v1/supervisor/toolkits', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: ToolkitEditorPayload) =>
    apiRequest<SupervisorToolkit>(`/api/v1/supervisor/toolkits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    apiRequest<void>(`/api/v1/supervisor/toolkits/${id}`, { method: 'DELETE' }),
}
