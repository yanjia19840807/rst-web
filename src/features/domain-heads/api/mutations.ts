import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { domainHeadApi } from '../api'
import type { SaveDomainHeadsRequest } from '../types'
import { domainHeadQueryKeys } from './queries'

export function useSaveDomainHeads() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveDomainHeadsRequest) => domainHeadApi.save(body),
    onSuccess: (page) => {
      queryClient.setQueryData(domainHeadQueryKeys.page(page.center), page)
    },
  })
}
