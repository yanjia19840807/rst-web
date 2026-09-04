import { ApiError, apiHeaders } from '@/api/client'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/** Download an Excel attachment from a GET API path. */
export async function downloadExcel(
  path: string,
  fallbackName: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: apiHeaders(undefined, { json: false }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ApiError(body?.detail || 'Export failed.', response.status)
  }
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = /filename="?([^"]+)"?/.exec(disposition)
  return { blob, filename: match?.[1] || fallbackName }
}
