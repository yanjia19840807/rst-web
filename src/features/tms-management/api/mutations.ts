import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { apiRequest } from '@/api/client'

import type { StartSessionInput, TmsSession } from '../types'
import { tmsQueryKeys } from './queries'

export function useTmsSessionMutations() {
  const queryClient = useQueryClient()

  const refreshTmsData = () => queryClient.invalidateQueries({ queryKey: tmsQueryKeys.all })

  const start = useMutation({
    mutationFn: (input: StartSessionInput) =>
      apiRequest<TmsSession>('/api/v1/tms/sessions', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: refreshTmsData,
  })

  const pause = useMutation({
    mutationFn: (id: string) =>
      apiRequest<TmsSession>(`/api/v1/tms/sessions/${id}/pause`, { method: 'POST' }),
    onSuccess: refreshTmsData,
  })

  const resume = useMutation({
    mutationFn: (id: string) =>
      apiRequest<TmsSession>(`/api/v1/tms/sessions/${id}/resume`, { method: 'POST' }),
    onSuccess: refreshTmsData,
  })

  const end = useMutation({
    mutationFn: (id: string) =>
      apiRequest<TmsSession>(`/api/v1/tms/sessions/${id}/end`, { method: 'POST' }),
    onSuccess: refreshTmsData,
  })

  const discard = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest<TmsSession>(`/api/v1/tms/sessions/${id}/discard`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: refreshTmsData,
  })

  return { start, pause, resume, end, discard }
}
