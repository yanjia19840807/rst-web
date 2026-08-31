import { applyDevIdentityHeaders } from '@/auth/dev-identity'
import { DELEGATION_HEADER, notifyDelegationEnded, readDelegationId } from '@/auth/delegation'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type ProblemBody = {
  detail?: string
  title?: string
  type?: string
}

function problemCode(type?: string) {
  if (!type) return undefined
  const marker = '/problems/'
  const index = type.lastIndexOf(marker)
  return index >= 0 ? type.slice(index + marker.length) : undefined
}

export function apiHeaders(init?: HeadersInit, options?: { json?: boolean }): Headers {
  const headers = new Headers(init)
  if (options?.json !== false && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const delegationId = readDelegationId()
  if (delegationId && !headers.has(DELEGATION_HEADER)) {
    headers.set(DELEGATION_HEADER, delegationId)
  }
  applyDevIdentityHeaders(headers)
  return headers
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: apiHeaders(init?.headers),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ProblemBody | null
    const code = problemCode(body?.type)
    if (response.status === 403 && code === 'delegation-inactive') {
      notifyDelegationEnded()
    }
    const detail = body?.detail || body?.title || 'The request could not be completed.'
    throw new ApiError(code ? `${detail} (${code})` : detail, response.status, code)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
