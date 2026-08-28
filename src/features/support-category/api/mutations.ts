import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { supportCategoryApi } from '../api'
import type {
  CreateSupportCategoryRequest,
  ReorderSupportCategoriesRequest,
  SupportCategoryAdminView,
  UpdateSupportCategoryRequest,
} from '../types'
import { supportCategoryQueryKeys } from './queries'

export function useCreateSupportCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSupportCategoryRequest) => supportCategoryApi.create(body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: supportCategoryQueryKeys.all })
    },
  })
}

export function useUpdateSupportCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSupportCategoryRequest }) =>
      supportCategoryApi.update(id, body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: supportCategoryQueryKeys.all })
    },
  })
}

export function useReorderSupportCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ReorderSupportCategoriesRequest) => supportCategoryApi.reorder(body),
    onSuccess: (page: SupportCategoryAdminView) => {
      queryClient.setQueryData(supportCategoryQueryKeys.admin, page)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: supportCategoryQueryKeys.all })
    },
  })
}

export function useDeleteSupportCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => supportCategoryApi.remove(id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: supportCategoryQueryKeys.all })
    },
  })
}
