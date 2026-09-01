import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { domainHeadApi } from '../api'

export const domainHeadQueryKeys = {
  all: ['domain-heads'] as const,
  centers: () => [...domainHeadQueryKeys.all, 'centers'] as const,
  page: (center?: string) => [...domainHeadQueryKeys.all, 'page', center ?? ''] as const,
}

export function useDomainHeadCentersQuery(enabled: () => boolean) {
  return useQuery({
    queryKey: domainHeadQueryKeys.centers(),
    queryFn: () => domainHeadApi.centers(),
    enabled: computed(() => enabled()),
  })
}

export function useDomainHeadsQuery(
  center: MaybeRefOrGetter<string | undefined>,
  enabled: () => boolean = () => true,
) {
  return useQuery({
    queryKey: computed(() => domainHeadQueryKeys.page(toValue(center))),
    queryFn: () => domainHeadApi.page(toValue(center)),
    enabled: computed(() => enabled()),
    placeholderData: keepPreviousData,
  })
}
