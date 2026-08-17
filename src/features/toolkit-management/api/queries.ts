import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { toolkitApi } from '../api'
import type { ToolkitListQuery } from '../types'

export const toolkitQueryKeys = {
  all: ['toolkit'] as const,
  list: (query: ToolkitListQuery = {}) =>
    [
      ...toolkitQueryKeys.all,
      'list',
      query.name ?? '',
      query.pl3Name ?? '',
      query.page ?? 1,
      query.pageSize ?? 10,
    ] as const,
  detail: (id: string) => [...toolkitQueryKeys.all, 'detail', id] as const,
  hierarchy: () => [...toolkitQueryKeys.all, 'hierarchy'] as const,
  candidates: (pl3Code: string, supervisorPositionId: string, countries: string[]) =>
    [...toolkitQueryKeys.all, 'candidates', pl3Code, supervisorPositionId, ...countries] as const,
}

export function useSupervisorToolkitsQuery(
  filters: MaybeRefOrGetter<ToolkitListQuery> = {},
) {
  const resolved = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => toolkitQueryKeys.list(resolved.value)),
    queryFn: () => toolkitApi.list(resolved.value),
    placeholderData: keepPreviousData,
  })
}

export function useToolkitQuery(id: MaybeRefOrGetter<string | undefined>) {
  const toolkitId = computed(() => toValue(id))
  return useQuery({
    queryKey: computed(() => toolkitQueryKeys.detail(toolkitId.value ?? '')),
    queryFn: () => toolkitApi.get(toolkitId.value!),
    enabled: computed(() => Boolean(toolkitId.value)),
  })
}

export function useToolkitHierarchyQuery() {
  return useQuery({
    queryKey: toolkitQueryKeys.hierarchy(),
    queryFn: toolkitApi.hierarchy,
  })
}

export function useSharedKpiCandidatesQuery(
  pl3Code: MaybeRefOrGetter<string>,
  supervisorPositionId: MaybeRefOrGetter<string>,
  countries: MaybeRefOrGetter<string[]>,
) {
  const resolvedPl3 = computed(() => toValue(pl3Code))
  const resolvedPosition = computed(() => toValue(supervisorPositionId))
  const resolvedCountries = computed(() => toValue(countries))
  return useQuery({
    queryKey: computed(() =>
      toolkitQueryKeys.candidates(
        resolvedPl3.value,
        resolvedPosition.value,
        resolvedCountries.value,
      ),
    ),
    queryFn: () =>
      toolkitApi.candidates(resolvedPl3.value, resolvedPosition.value, resolvedCountries.value),
    enabled: computed(() => Boolean(resolvedPl3.value && resolvedPosition.value)),
  })
}
