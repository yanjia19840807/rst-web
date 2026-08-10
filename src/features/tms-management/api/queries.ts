import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { apiRequest } from '@/api/client'

import type { PageResult, SessionFilters, Toolkit, TmsSession, TmsSummary } from '../types'

export const tmsQueryKeys = {
  all: ['tms'] as const,
  toolkits: () => [...tmsQueryKeys.all, 'toolkits'] as const,
  summary: () => [...tmsQueryKeys.all, 'summary'] as const,
  current: () => [...tmsQueryKeys.all, 'current'] as const,
  session: (id: string) => [...tmsQueryKeys.all, 'session', id] as const,
  sessions: (filters: SessionFilters & { status: 'paused' | 'completed' }) =>
    [...tmsQueryKeys.all, 'sessions', filters] as const,
}

export function useToolkitsQuery() {
  return useQuery({
    queryKey: tmsQueryKeys.toolkits(),
    queryFn: () => apiRequest<Toolkit[]>('/api/v1/toolkits'),
  })
}

export function useTmsSummaryQuery() {
  return useQuery({
    queryKey: tmsQueryKeys.summary(),
    queryFn: () => apiRequest<TmsSummary>('/api/v1/tms/summary'),
  })
}

export function useCurrentSessionQuery() {
  return useQuery({
    queryKey: tmsQueryKeys.current(),
    queryFn: () => apiRequest<TmsSession | null>('/api/v1/tms/sessions/current'),
  })
}

export function useTmsSessionDetailQuery(id: MaybeRefOrGetter<string>) {
  const sessionId = computed(() => toValue(id))
  return useQuery({
    queryKey: computed(() => tmsQueryKeys.session(sessionId.value)),
    queryFn: () => apiRequest<TmsSession>(`/api/v1/tms/sessions/${sessionId.value}`),
    enabled: computed(() => Boolean(sessionId.value)),
  })
}

export function useTmsSessionsQuery(
  filters: MaybeRefOrGetter<SessionFilters & { status: 'paused' | 'completed' }>,
) {
  const resolvedFilters = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => tmsQueryKeys.sessions(resolvedFilters.value)),
    queryFn: () => {
      const { status, sessionNo, reference, query, dateFrom, dateTo, page, pageSize } =
        resolvedFilters.value
      const params = new URLSearchParams({
        status,
        page: String(page),
        pageSize: String(pageSize),
      })
      if (sessionNo) params.set('sessionNo', sessionNo)
      if (reference) params.set('reference', reference)
      if (query) params.set('query', query)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      return apiRequest<PageResult<TmsSession>>(`/api/v1/tms/sessions?${params}`)
    },
  })
}
