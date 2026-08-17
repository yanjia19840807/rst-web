import { apiRequest } from '@/api/client'

import type {
  BenchmarkingQuery,
  BenchmarkingView,
  DashboardResponse,
  RepositoryListQuery,
  RepositoryListView,
  SupportRepositoryQuery,
  SupportRepositoryResponse,
  ValidationWorkflowQuery,
  ValidationWorkflowView,
} from './types'

const base = '/api/v1/governance'

function appendPaging(search: URLSearchParams, params?: { page?: number; pageSize?: number }) {
  search.set('page', String(params?.page ?? 1))
  search.set('pageSize', String(params?.pageSize ?? 10))
}

function repositoryListQuery(params?: RepositoryListQuery) {
  const search = new URLSearchParams()
  if (params) {
    const exerciseCode = params.exerciseCode?.trim()
    if (exerciseCode) search.set('exerciseCode', exerciseCode)
    if (params.center) search.set('center', params.center)
    if (params.domain) search.set('domain', params.domain)
    if (params.pl3Name) search.set('pl3Name', params.pl3Name)
    if (params.toolkitName) search.set('toolkitName', params.toolkitName)
    if (params.submittedFrom) search.set('submittedFrom', params.submittedFrom)
    if (params.submittedTo) search.set('submittedTo', params.submittedTo)
  }
  appendPaging(search, params)
  return `?${search.toString()}`
}

function supportRepositoryQuery(params?: SupportRepositoryQuery) {
  const search = new URLSearchParams()
  if (params) {
    if (params.center) search.set('center', params.center)
    if (params.category) search.set('category', params.category)
    if (params.toolkitName) search.set('toolkitName', params.toolkitName)
    if (params.submittedFrom) search.set('submittedFrom', params.submittedFrom)
    if (params.submittedTo) search.set('submittedTo', params.submittedTo)
  }
  appendPaging(search, params)
  return `?${search.toString()}`
}

function validationWorkflowQuery(params?: ValidationWorkflowQuery) {
  const search = new URLSearchParams()
  if (params) {
    const exerciseCode = params.exerciseCode?.trim()
    if (exerciseCode) search.set('exerciseCode', exerciseCode)
    if (params.center) search.set('center', params.center)
    if (params.domain) search.set('domain', params.domain)
    if (params.pl3Name) search.set('pl3Name', params.pl3Name)
    if (params.toolkitName) search.set('toolkitName', params.toolkitName)
    if (params.agingMinDays != null) search.set('agingMinDays', String(params.agingMinDays))
    if (params.submittedFrom) search.set('submittedFrom', params.submittedFrom)
    if (params.submittedTo) search.set('submittedTo', params.submittedTo)
  }
  appendPaging(search, params)
  return `?${search.toString()}`
}

function benchmarkingQuery(params?: BenchmarkingQuery) {
  const search = new URLSearchParams()
  if (params) {
    if (params.center) search.set('center', params.center)
    if (params.domain) search.set('domain', params.domain)
    if (params.pl1) search.set('pl1', params.pl1)
    if (params.pl2) search.set('pl2', params.pl2)
    if (params.pl3Code) search.set('pl3Code', params.pl3Code)
    if (params.submittedFrom) search.set('submittedFrom', params.submittedFrom)
    if (params.submittedTo) search.set('submittedTo', params.submittedTo)
  }
  appendPaging(search, params)
  return `?${search.toString()}`
}

export const governanceApi = {
  dashboard: () => apiRequest<DashboardResponse>(`${base}/dashboard`),
  repository: (params?: RepositoryListQuery) =>
    apiRequest<RepositoryListView>(`${base}/repository${repositoryListQuery(params)}`),
  supportRepository: (params?: SupportRepositoryQuery) =>
    apiRequest<SupportRepositoryResponse>(
      `${base}/support-repository${supportRepositoryQuery(params)}`,
    ),
  benchmarking: (params?: BenchmarkingQuery) =>
    apiRequest<BenchmarkingView>(`${base}/benchmarking${benchmarkingQuery(params)}`),
  validationWorkflow: (params?: ValidationWorkflowQuery) =>
    apiRequest<ValidationWorkflowView>(
      `${base}/validation-workflow${validationWorkflowQuery(params)}`,
    ),
}
