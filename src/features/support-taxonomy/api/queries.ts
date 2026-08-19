import { useQuery } from '@tanstack/vue-query'

import { supportTaxonomyApi } from '../api'

export const supportTaxonomyQueryKeys = {
  all: ['support-taxonomy'] as const,
}

export function useSupportTaxonomyQuery() {
  return useQuery({
    queryKey: supportTaxonomyQueryKeys.all,
    queryFn: () => supportTaxonomyApi.list(),
  })
}
