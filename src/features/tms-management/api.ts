import { apiRequest } from '@/api/client'
import { downloadExcel } from '@/api/download'

import type { PausedSessionMatch, SessionFilters, TmsListMode } from './types'

function sessionExportQuery(filters: SessionFilters & { status: 'paused' | 'completed' }) {
  const params = new URLSearchParams({ status: filters.status })
  const sessionNo = filters.sessionNo?.trim()
  const reference = filters.reference?.trim()
  const query = filters.query?.trim()
  if (sessionNo) params.set('sessionNo', sessionNo)
  if (reference) params.set('reference', reference)
  if (query) params.set('query', query)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.agentCcgid) params.set('agentCcgid', filters.agentCcgid)
  if (filters.toolkitId) params.set('toolkitId', filters.toolkitId)
  if (filters.center) params.set('center', filters.center)
  if (filters.domain) params.set('domain', filters.domain)
  if (filters.pl3Code) params.set('pl3Code', filters.pl3Code)
  if (filters.carrier) params.set('carrier', filters.carrier)
  if (filters.site) params.set('site', filters.site)
  if (filters.customerCountry) params.set('customerCountry', filters.customerCountry)
  if (filters.enabled === true) params.set('enabled', 'true')
  if (filters.enabled === false) params.set('enabled', 'false')
  return params.toString()
}

export const tmsApi = {
  pausedMatch: (toolkitId: string, reference: string, subtaskId?: string | null) => {
    const params = new URLSearchParams({ toolkitId, reference })
    if (subtaskId?.trim()) params.set('subtaskId', subtaskId.trim())
    return apiRequest<PausedSessionMatch>(`/api/v1/tms/sessions/paused-match?${params}`)
  },
  exportSessions: (
    filters: SessionFilters & { status: 'paused' | 'completed' },
    mode: TmsListMode = 'agent',
  ) => {
    const query = sessionExportQuery(filters)
    const path =
      mode === 'supervisor'
        ? `/api/v1/tms/team/sessions/export?${query}`
        : `/api/v1/tms/sessions/export?${query}`
    return downloadExcel(
      path,
      mode === 'supervisor' ? 'tms-team-sessions.xlsx' : 'tms-sessions.xlsx',
    )
  },
}
