import { useQuery } from '@tanstack/vue-query'

import { domainHeadApi } from '../api'

export const domainHeadQueryKeys = {
  all: ['domain-heads'] as const,
  page: () => [...domainHeadQueryKeys.all, 'page'] as const,
}

export function useDomainHeadsQuery() {
  return useQuery({
    queryKey: domainHeadQueryKeys.page(),
    queryFn: () => domainHeadApi.page(),
  })
}
