import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { sourceDataApi } from './api'
import type { SourceTableQuery } from './types'

export const sourceDataQueryKeys = {
  all: ['source-data'] as const,
  centers: ['source-data', 'centers'] as const,
  sites: ['source-data', 'sites'] as const,
  active: ['source-data', 'active'] as const,
  current: (center: string) => ['source-data', 'current', center] as const,
  people: (query: SourceTableQuery) => ['source-data', 'people', query] as const,
  positions: (query: SourceTableQuery) => ['source-data', 'positions', query] as const,
  seats: (query: SourceTableQuery) => ['source-data', 'seats', query] as const,
  processes: (query: SourceTableQuery) => ['source-data', 'processes', query] as const,
  deliveryHc: (query: SourceTableQuery) => ['source-data', 'delivery-hc', query] as const,
}

export function useCenterSourcesQuery() {
  return useQuery({
    queryKey: sourceDataQueryKeys.centers,
    queryFn: () => sourceDataApi.centers(),
  })
}

export function useSiteMappingsQuery(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: sourceDataQueryKeys.sites,
    queryFn: () => sourceDataApi.sites(),
    enabled: computed(() => toValue(enabled)),
  })
}

export function useActiveSourceFilesQuery(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: sourceDataQueryKeys.active,
    queryFn: () => sourceDataApi.active(),
    enabled: computed(() => toValue(enabled)),
  })
}

export function useCurrentSourceQuery(center: MaybeRefOrGetter<string>) {
  const resolved = computed(() => toValue(center))
  return useQuery({
    queryKey: computed(() => sourceDataQueryKeys.current(resolved.value)),
    queryFn: () => sourceDataApi.current(resolved.value),
    enabled: computed(() => Boolean(resolved.value)),
  })
}

function tableQuery(query: MaybeRefOrGetter<SourceTableQuery>, enabled: MaybeRefOrGetter<boolean>) {
  const resolved = computed(() => toValue(query))
  return {
    resolved,
    options: {
      enabled: computed(() => toValue(enabled) && Boolean(resolved.value.center)),
      placeholderData: keepPreviousData,
    },
  }
}

export function useSourcePeopleQuery(
  query: MaybeRefOrGetter<SourceTableQuery>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const { resolved, options } = tableQuery(query, enabled)
  return useQuery({
    queryKey: computed(() => sourceDataQueryKeys.people(resolved.value)),
    queryFn: () => sourceDataApi.people(resolved.value),
    ...options,
  })
}

export function useSourcePositionsQuery(
  query: MaybeRefOrGetter<SourceTableQuery>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const { resolved, options } = tableQuery(query, enabled)
  return useQuery({
    queryKey: computed(() => sourceDataQueryKeys.positions(resolved.value)),
    queryFn: () => sourceDataApi.positions(resolved.value),
    ...options,
  })
}

export function useSourceSeatsQuery(
  query: MaybeRefOrGetter<SourceTableQuery>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const { resolved, options } = tableQuery(query, enabled)
  return useQuery({
    queryKey: computed(() => sourceDataQueryKeys.seats(resolved.value)),
    queryFn: () => sourceDataApi.seats(resolved.value),
    ...options,
  })
}

export function useSourceProcessesQuery(
  query: MaybeRefOrGetter<SourceTableQuery>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const { resolved, options } = tableQuery(query, enabled)
  return useQuery({
    queryKey: computed(() => sourceDataQueryKeys.processes(resolved.value)),
    queryFn: () => sourceDataApi.processes(resolved.value),
    ...options,
  })
}

export function useSourceDeliveryHcQuery(
  query: MaybeRefOrGetter<SourceTableQuery>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const { resolved, options } = tableQuery(query, enabled)
  return useQuery({
    queryKey: computed(() => sourceDataQueryKeys.deliveryHc(resolved.value)),
    queryFn: () => sourceDataApi.deliveryHc(resolved.value),
    ...options,
  })
}
