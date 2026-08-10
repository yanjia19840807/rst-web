import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { apiRequest } from '@/api/client'

import type {
  PageResult,
  SessionFilters,
  TeamAgentOption,
  Toolkit,
  TmsListMode,
  TmsSession,
  TmsSummary,
} from '../types'

export const tmsQueryKeys = {
  all: ['tms'] as const,
  toolkits: () => [...tmsQueryKeys.all, 'toolkits'] as const,
  supervisorToolkits: () => [...tmsQueryKeys.all, 'supervisor-toolkits'] as const,
  teamAgents: () => [...tmsQueryKeys.all, 'team-agents'] as const,
  summary: () => [...tmsQueryKeys.all, 'summary'] as const,
  current: () => [...tmsQueryKeys.all, 'current'] as const,
  session: (mode: TmsListMode, id: string) =>
    [...tmsQueryKeys.all, 'session', mode, id] as const,
  sessions: (mode: TmsListMode, filters: SessionFilters & { status: 'paused' | 'completed' }) =>
    [...tmsQueryKeys.all, 'sessions', mode, filters] as const,
}

export function useToolkitsQuery() {
  return useQuery({
    queryKey: tmsQueryKeys.toolkits(),
    queryFn: () => apiRequest<Toolkit[]>('/api/v1/toolkits'),
  })
}

export function useSupervisorToolkitsQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: tmsQueryKeys.supervisorToolkits(),
    queryFn: () => apiRequest<Toolkit[]>('/api/v1/supervisor/toolkits'),
    enabled: computed(() => toValue(enabled)),
  })
}

export function useTeamAgentsQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: tmsQueryKeys.teamAgents(),
    queryFn: () => apiRequest<TeamAgentOption[]>('/api/v1/supervisor/tms/agents'),
    enabled: computed(() => toValue(enabled)),
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

export function useTmsSessionDetailQuery(
  id: MaybeRefOrGetter<string>,
  mode: MaybeRefOrGetter<TmsListMode> = 'agent',
) {
  const sessionId = computed(() => toValue(id))
  const resolvedMode = computed(() => toValue(mode))
  return useQuery({
    queryKey: computed(() => tmsQueryKeys.session(resolvedMode.value, sessionId.value)),
    queryFn: () => {
      const path =
        resolvedMode.value === 'supervisor'
          ? `/api/v1/supervisor/tms/sessions/${sessionId.value}`
          : `/api/v1/tms/sessions/${sessionId.value}`
      return apiRequest<TmsSession>(path)
    },
    enabled: computed(() => Boolean(sessionId.value)),
  })
}

export function useTmsSessionsQuery(
  filters: MaybeRefOrGetter<SessionFilters & { status: 'paused' | 'completed' }>,
  mode: MaybeRefOrGetter<TmsListMode> = 'agent',
) {
  const resolvedFilters = computed(() => toValue(filters))
  const resolvedMode = computed(() => toValue(mode))
  return useQuery({
    queryKey: computed(() =>
      tmsQueryKeys.sessions(resolvedMode.value, resolvedFilters.value),
    ),
    queryFn: () => {
      const {
        status,
        sessionNo,
        reference,
        query,
        dateFrom,
        dateTo,
        agentCcgid,
        toolkitId,
        pl3Code,
        page,
        pageSize,
      } = resolvedFilters.value
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
      if (agentCcgid) params.set('agentCcgid', agentCcgid)
      if (toolkitId) params.set('toolkitId', toolkitId)
      if (pl3Code) params.set('pl3Code', pl3Code)
      const path =
        resolvedMode.value === 'supervisor'
          ? `/api/v1/supervisor/tms/sessions?${params}`
          : `/api/v1/tms/sessions?${params}`
      return apiRequest<PageResult<TmsSession>>(path)
    },
  })
}
