import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { apiRequest } from '@/api/client'

import type { StartSessionInput, TmsSession } from '../types'
import { tmsQueryKeys } from './queries'

export function useTmsSessionMutations() {
  const queryClient = useQueryClient()

  const invalidateSessionState = () => {
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.current() })
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.summary() })
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.sessionsPrefix() })
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.sessionPrefix() })
  }

  const start = useMutation({
    mutationFn: (input: StartSessionInput) =>
      apiRequest<TmsSession>('/api/v1/tms/sessions', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(tmsQueryKeys.current(), session)
      invalidateSessionState()
    },
  })

  const pause = useMutation({
    mutationFn: (id: string) =>
      apiRequest<TmsSession>(`/api/v1/tms/sessions/${id}/pause`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(tmsQueryKeys.current(), null)
      invalidateSessionState()
    },
  })

  const resume = useMutation({
    mutationFn: (id: string) =>
      apiRequest<TmsSession>(`/api/v1/tms/sessions/${id}/resume`, { method: 'POST' }),
    onSuccess: (session) => {
      queryClient.setQueryData(tmsQueryKeys.current(), session)
      invalidateSessionState()
    },
  })

  const end = useMutation({
    mutationFn: (id: string) =>
      apiRequest<TmsSession>(`/api/v1/tms/sessions/${id}/end`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(tmsQueryKeys.current(), null)
      invalidateSessionState()
    },
  })

  const discard = useMutation({
    mutationFn: (id: string) =>
      apiRequest<TmsSession>(`/api/v1/tms/sessions/${id}/discard`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      queryClient.setQueryData(tmsQueryKeys.current(), null)
      invalidateSessionState()
    },
  })

  return { start, pause, resume, end, discard }
}
