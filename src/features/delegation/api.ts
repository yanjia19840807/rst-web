import { apiRequest } from '@/api/client'

import type {
  AssignDelegationRequest,
  CreateDelegationRequest,
  Delegation,
  DelegationCandidatePage,
  PositionAssignment,
} from './types'

const base = '/api/v1/delegations'

export const delegationApi = {
  granted: () => apiRequest<Delegation[]>(`${base}/granted`),
  received: () => apiRequest<Delegation[]>(`${base}/received`),
  create: (body: CreateDelegationRequest) =>
    apiRequest<Delegation[]>(base, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  revoke: (id: string) =>
    apiRequest<Delegation>(`${base}/${id}/revoke`, {
      method: 'POST',
    }),
  seats: () => apiRequest<PositionAssignment[]>(`${base}/seats`),
  assignments: () => apiRequest<PositionAssignment[]>(`${base}/assignments`),
  assign: (body: AssignDelegationRequest) =>
    apiRequest<Delegation[]>(`${base}/assignments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  candidates: (query: { q?: string; page: number; pageSize: number }) => {
    const params = new URLSearchParams()
    if (query.q?.trim()) params.set('q', query.q.trim())
    params.set('page', String(query.page))
    params.set('pageSize', String(query.pageSize))
    return apiRequest<DelegationCandidatePage>(`${base}/candidates?${params.toString()}`)
  },
}
