import { apiRequest } from '@/api/client'

import type {
  ApprovalDetailView,
  ApprovalQueueQuery,
  ApprovalQueueView,
  ApproveRequest,
  ReturnRequest,
} from './types'

const base = '/api/v1/approvals'

function queueQuery(params?: ApprovalQueueQuery) {
  const search = new URLSearchParams()
  if (params) {
    if (params.status) search.set('status', params.status)
    if (params.completed != null) search.set('completed', String(params.completed))
    const exerciseCode = params.exerciseCode?.trim()
    if (exerciseCode) search.set('exerciseCode', exerciseCode)
    if (params.toolkitName) search.set('toolkitName', params.toolkitName)
    if (params.pl3Name) search.set('pl3Name', params.pl3Name)
    if (params.submittedFrom) search.set('submittedFrom', params.submittedFrom)
    if (params.submittedTo) search.set('submittedTo', params.submittedTo)
    if (params.completedFrom) search.set('completedFrom', params.completedFrom)
    if (params.completedTo) search.set('completedTo', params.completedTo)
    if (params.decision) search.set('decision', params.decision)
  }
  search.set('page', String(params?.page ?? 1))
  search.set('pageSize', String(params?.pageSize ?? 10))
  return `?${search.toString()}`
}

export const approvalApi = {
  queue: (params?: ApprovalQueueQuery) =>
    apiRequest<ApprovalQueueView>(`${base}/queue${queueQuery(params)}`),
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
