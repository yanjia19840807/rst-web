import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { delegationApi } from '../api'

export const delegationQueryKeys = {
  all: ['delegations'] as const,
  granted: () => [...delegationQueryKeys.all, 'granted'] as const,
  received: () => [...delegationQueryKeys.all, 'received'] as const,
  seats: () => [...delegationQueryKeys.all, 'seats'] as const,
  assignments: () => [...delegationQueryKeys.all, 'assignments'] as const,
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

export function useReceivedDelegationsQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: delegationQueryKeys.received(),
    queryFn: () => delegationApi.received(),
    enabled: computed(() => toValue(enabled)),
  })
}

export function useOwnSeatsQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: delegationQueryKeys.seats(),
    queryFn: () => delegationApi.seats(),
    enabled: computed(() => toValue(enabled)),
  })
}

export function usePositionAssignmentsQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: delegationQueryKeys.assignments(),
    queryFn: () => delegationApi.assignments(),
    enabled: computed(() => toValue(enabled)),
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
