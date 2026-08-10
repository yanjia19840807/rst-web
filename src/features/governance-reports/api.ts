import { apiRequest } from '@/api/client'

import type {
  BenchmarkingResponse,
  DashboardResponse,
  RepositoryRow,
  SupportRepositoryResponse,
  ValidationWorkflowRow,
} from './types'

const base = '/api/v1/governance'

async function withPrototypeFallback<T>(request: () => Promise<T>, fallback: () => Promise<T>) {
  try {
    return await request()
  } catch {
    return fallback()
  }
}

export const governanceApi = {
  dashboard: () =>
    withPrototypeFallback(
      () => apiRequest<DashboardResponse>(`${base}/dashboard`),
      async () => (await import('@/mocks/data/governance')).dashboardData,
    ),
  repository: () =>
    withPrototypeFallback(
      () => apiRequest<RepositoryRow[]>(`${base}/repository`),
      async () => (await import('@/mocks/data/governance')).repositoryRows,
    ),
  supportRepository: () =>
    withPrototypeFallback(
      () => apiRequest<SupportRepositoryResponse>(`${base}/support-repository`),
      async () => (await import('@/mocks/data/governance')).supportRepositoryData,
    ),
  benchmarking: () =>
    withPrototypeFallback(
      () => apiRequest<BenchmarkingResponse>(`${base}/benchmarking`),
      async () => (await import('@/mocks/data/governance')).benchmarkingData,
    ),
  validationWorkflow: () =>
    withPrototypeFallback(
      () => apiRequest<ValidationWorkflowRow[]>(`${base}/validation-workflow`),
      async () => (await import('@/mocks/data/governance')).validationWorkflowRows,
    ),
}
