import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { delegationApi } from '../api'

export const delegationQueryKeys = {
  all: ['delegations'] as const,
  granted: () => [...delegationQueryKeys.all, 'granted'] as const,
  received: () => [...delegationQueryKeys.all, 'received'] as const,
  candidates: (q: string, page: number, pageSize: number) =>
    [...delegationQueryKeys.all, 'candidates', q, page, pageSize] as const,
}

export function useGrantedDelegationsQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: delegationQueryKeys.granted(),
    queryFn: () => delegationApi.granted(),
    enabled: computed(() => toValue(enabled)),
  })
}

export function useReceivedDelegationsQuery() {
  return useQuery({
    queryKey: delegationQueryKeys.received(),
    queryFn: () => delegationApi.received(),
  })
}

export function useDelegationCandidatesQuery(
  query: MaybeRefOrGetter<{ q?: string; page: number; pageSize: number }>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  return useQuery({
    queryKey: computed(() => {
      const value = toValue(query)
      return delegationQueryKeys.candidates(value.q ?? '', value.page, value.pageSize)
    }),
    queryFn: () => delegationApi.candidates(toValue(query)),
    enabled: computed(() => toValue(enabled)),
    placeholderData: keepPreviousData,
  })
}
