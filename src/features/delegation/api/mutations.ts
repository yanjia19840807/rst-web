import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { delegationApi } from '../api'
import type { CreateDelegationRequest } from '../types'
import { delegationQueryKeys } from './queries'

export function useCreateDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDelegationRequest) => delegationApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: delegationQueryKeys.all })
    },
  })
}

export function useRevokeDelegation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => delegationApi.revoke(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: delegationQueryKeys.all })
    },
  })
}
