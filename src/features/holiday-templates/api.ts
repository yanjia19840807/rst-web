import { ApiError, apiRequest } from '@/api/client'

import type {
  HolidayTemplateCreateRequest,
  HolidayTemplateDetail,
  HolidayTemplateSummary,
  HolidayTemplateUpdateRequest,
} from './types'

const BASE = '/api/v1/holiday-templates'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

async function downloadBlob(path: string, fallbackName: string) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ApiError(body?.detail || 'Download failed.', response.status)
  }
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = /filename="?([^"]+)"?/.exec(disposition)
  const filename = match?.[1] || fallbackName
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const holidayTemplateApi = {
  list: (params?: { center?: string; year?: number; status?: string }) => {
    const query = new URLSearchParams()
    if (params?.center) query.set('center', params.center)
    if (params?.year != null) query.set('year', String(params.year))
    if (params?.status) query.set('status', params.status)
    const suffix = query.toString() ? `?${query}` : ''
    return apiRequest<HolidayTemplateSummary[]>(`${BASE}${suffix}`)
  },
  get: (id: string) => apiRequest<HolidayTemplateDetail>(`${BASE}/${id}`),
  byCenter: (center: string, year: number) =>
    apiRequest<HolidayTemplateDetail>(
      `${BASE}/by-center?center=${encodeURIComponent(center)}&year=${year}`,
    ),
  create: (body: HolidayTemplateCreateRequest) =>
    apiRequest<HolidayTemplateDetail>(BASE, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: HolidayTemplateUpdateRequest) =>
    apiRequest<HolidayTemplateDetail>(`${BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  publish: (id: string) =>
    apiRequest<HolidayTemplateDetail>(`${BASE}/${id}/publish`, { method: 'POST' }),
  remove: (id: string) => apiRequest<void>(`${BASE}/${id}`, { method: 'DELETE' }),
  exportBlank: () => downloadBlob(`${BASE}/export-blank`, 'holiday-template-blank.xlsx'),
  export: (id: string) => downloadBlob(`${BASE}/${id}/export`, 'holiday-template.xlsx'),
  importExcel: async (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(`${API_BASE_URL}${BASE}/${id}/import`, {
      method: 'POST',
      body: form,
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null
      throw new ApiError(body?.detail || 'Import failed.', response.status)
    }
    return response.json() as Promise<HolidayTemplateDetail>
  },
}
