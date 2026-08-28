import { useQuery } from '@tanstack/vue-query'

import { supportCategoryApi } from '../api'

export const supportCategoryQueryKeys = {
  all: ['support-categories'] as const,
  admin: ['support-categories', 'admin'] as const,
}

export function useSupportCategoryQuery() {
  return useQuery({
    queryKey: supportCategoryQueryKeys.all,
    queryFn: () => supportCategoryApi.list(),
  })
}

export function useSupportCategoryAdminQuery() {
  return useQuery({
    queryKey: supportCategoryQueryKeys.admin,
    queryFn: () => supportCategoryApi.listAdmin(),
  })
}
