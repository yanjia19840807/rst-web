import { ApiError, apiHeaders, apiRequest } from '@/api/client'
import { downloadExcel } from '@/api/download'

import type {
  CenterSource,
  CenterSourceMode,
  CurrentSource,
  ImportResult,
  SiteMapping,
  SourceDeliveryHc,
  SourceFile,
  SourcePage,
  SourcePerson,
  SourcePosition,
  SourceProcess,
  SourceSeat,
  SourceTableQuery,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const base = '/api/v1/source-data'

export const sourceDataApi = {
  centers: () => apiRequest<CenterSource[]>(`${base}/centers`),
  updateCenter: (center: string, mode: CenterSourceMode) =>
    apiRequest<CenterSource>(`${base}/centers/${encodeURIComponent(center)}`, {
      method: 'PUT',
      body: JSON.stringify({ mode }),
    }),
  sites: () => apiRequest<SiteMapping[]>(`${base}/sites`),
  saveSite: (mapping: SiteMapping) =>
    apiRequest<SiteMapping>(`${base}/sites`, {
      method: 'PUT',
      body: JSON.stringify(mapping),
    }),
  deleteSite: (gbsSite: string) =>
    apiRequest<void>(`${base}/sites/${encodeURIComponent(gbsSite)}`, { method: 'DELETE' }),
  active: () => apiRequest<SourceFile[]>(`${base}/active`),
  current: (center: string) =>
    apiRequest<CurrentSource>(`${base}/current?center=${encodeURIComponent(center)}`),
  people: (query: SourceTableQuery) =>
    apiRequest<SourcePage<SourcePerson>>(`${base}/current/people?${tableParams(query)}`),
  positions: (query: SourceTableQuery) =>
    apiRequest<SourcePage<SourcePosition>>(`${base}/current/positions?${tableParams(query)}`),
  seats: (query: SourceTableQuery) =>
    apiRequest<SourcePage<SourceSeat>>(`${base}/current/seats?${tableParams(query)}`),
  processes: (query: SourceTableQuery) =>
    apiRequest<SourcePage<SourceProcess>>(`${base}/current/processes?${tableParams(query)}`),
  deliveryHc: (query: SourceTableQuery) =>
    apiRequest<SourcePage<SourceDeliveryHc>>(`${base}/current/delivery-hc?${tableParams(query)}`),
  download: (id: string, fallbackName: string) =>
    downloadExcel(`${base}/snapshots/${id}/file`, fallbackName),
  upload: async (kind: 'myhr' | 'skpi', file: File) => {
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(`${API_BASE_URL}${base}/${kind}`, {
      method: 'POST',
      credentials: 'include',
      headers: apiHeaders(undefined, { json: false }),
      body: form,
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null
      throw new ApiError(body?.detail || 'Upload failed.', response.status)
    }
    return response.json() as Promise<ImportResult>
  },
}

function tableParams(query: SourceTableQuery) {
  const params = new URLSearchParams()
  params.set('center', query.center)
  if (query.q) params.set('q', query.q)
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  return params.toString()
}
