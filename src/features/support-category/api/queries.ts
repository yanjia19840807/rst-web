import { useQuery } from '@tanstack/vue-query'

import { supportCategoryApi } from '../api'

export const supportCategoryQueryKeys = {
  all: ['support-categories'] as const,
}

export function useSupportCategoryQuery() {
  return useQuery({
    queryKey: supportCategoryQueryKeys.all,
    queryFn: () => supportCategoryApi.list(),
  })
}
