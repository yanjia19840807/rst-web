import { downloadExcel } from '@/api/download'

import type { SessionFilters, TmsListMode } from './types'

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
  if (filters.pl3Code) params.set('pl3Code', filters.pl3Code)
  return params.toString()
}

export const tmsApi = {
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
