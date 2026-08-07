import { apiRequest } from '@/api/client'

import type {
  ApprovalDetailView,
  ApprovalQueueItem,
  ApproveRequest,
  ReturnRequest,
} from './types'

const base = '/api/v1/approvals'

export const approvalApi = {
  queue: (params?: { status?: string; archived?: boolean }) => {
    const search = new URLSearchParams()
    if (params?.status) search.set('status', params.status)
    if (params?.archived != null) search.set('archived', String(params.archived))
    const query = search.toString()
    return apiRequest<ApprovalQueueItem[]>(`${base}/queue${query ? `?${query}` : ''}`)
  },
  detail: (submissionId: string) =>
    apiRequest<ApprovalDetailView>(`${base}/${submissionId}`),
  approve: (submissionId: string, body: ApproveRequest = {}) =>
    apiRequest<ApprovalDetailView>(`${base}/${submissionId}/approve`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  returnToSupervisor: (submissionId: string, body: ReturnRequest) =>
    apiRequest<ApprovalDetailView>(`${base}/${submissionId}/return`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
