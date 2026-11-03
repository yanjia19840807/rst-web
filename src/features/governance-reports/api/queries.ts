import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { governanceApi } from '../api'
import type {
  BenchmarkingQuery,
  RepositoryListQuery,
  SupportRepositoryQuery,
  ValidationWorkflowQuery,
} from '../types'

export const governanceQueryKeys = {
  all: ['governance'] as const,
  dashboard: () => [...governanceQueryKeys.all, 'dashboard'] as const,
  repository: (query: RepositoryListQuery = {}) =>
    [...governanceQueryKeys.all, 'repository', query] as const,
  repositoryToolkit: (exerciseId: string) =>
    [...governanceQueryKeys.all, 'repository-toolkit', exerciseId] as const,
  supportRepository: (query: SupportRepositoryQuery = {}) =>
    [...governanceQueryKeys.all, 'support-repository', query] as const,
  validationWorkflow: (query: ValidationWorkflowQuery = {}) =>
    [...governanceQueryKeys.all, 'validation-workflow', query] as const,
  validationWorkflowToolkit: (exerciseId: string) =>
    [...governanceQueryKeys.all, 'validation-workflow-toolkit', exerciseId] as const,
  benchmarking: (query: BenchmarkingQuery = {}) =>
    [...governanceQueryKeys.all, 'benchmarking', query] as const,
}

export function useDashboardQuery(
  filters: MaybeRefOrGetter<{ regions?: string[]; clusters?: string[] }> = {},
) {
  const resolved = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => [...governanceQueryKeys.dashboard(), resolved.value]),
    queryFn: () => governanceApi.dashboard(resolved.value),
  })
}

export function useRepositoryQuery(filters: MaybeRefOrGetter<RepositoryListQuery> = {}) {
  const resolved = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => governanceQueryKeys.repository(resolved.value)),
    queryFn: () => governanceApi.repository(resolved.value),
    placeholderData: keepPreviousData,
  })
}

export function useSupportRepositoryQuery(filters: MaybeRefOrGetter<SupportRepositoryQuery> = {}) {
  const resolved = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => governanceQueryKeys.supportRepository(resolved.value)),
    queryFn: () => governanceApi.supportRepository(resolved.value),
    placeholderData: keepPreviousData,
  })
}

export function useValidationWorkflowQuery(filters: MaybeRefOrGetter<ValidationWorkflowQuery> = {}) {
  const resolved = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => governanceQueryKeys.validationWorkflow(resolved.value)),
    queryFn: () => governanceApi.validationWorkflow(resolved.value),
    placeholderData: keepPreviousData,
  })
}

export function useBenchmarkingQuery(filters: MaybeRefOrGetter<BenchmarkingQuery> = {}) {
  const resolved = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => governanceQueryKeys.benchmarking(resolved.value)),
    queryFn: () => governanceApi.benchmarking(resolved.value),
    placeholderData: keepPreviousData,
  })
}
