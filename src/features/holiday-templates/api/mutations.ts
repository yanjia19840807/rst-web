import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { holidayTemplateApi } from '../api'
import type {
  HolidayTemplateCreateRequest,
  HolidayTemplateUpdateRequest,
} from '../types'
import { holidayTemplateQueryKeys } from './queries'

export function useHolidayTemplateMutations() {
  const queryClient = useQueryClient()

  const refreshLists = () =>
    queryClient.invalidateQueries({ queryKey: [...holidayTemplateQueryKeys.all, 'list'] })

  const create = useMutation({
    mutationFn: (body: HolidayTemplateCreateRequest) => holidayTemplateApi.create(body),
    onSuccess: (detail) => {
      queryClient.setQueryData(holidayTemplateQueryKeys.detail(detail.id), detail)
      void refreshLists()
    },
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: HolidayTemplateUpdateRequest }) =>
      holidayTemplateApi.update(id, body),
    onSuccess: (detail) => {
      queryClient.setQueryData(holidayTemplateQueryKeys.detail(detail.id), detail)
      void refreshLists()
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => holidayTemplateApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: holidayTemplateQueryKeys.detail(id) })
      void refreshLists()
    },
  })

  const parseExcel = useMutation({
    mutationFn: ({ year, file }: { year: number; file: File }) =>
      holidayTemplateApi.parseExcel(year, file),
  })

  return { create, update, remove, parseExcel }
}
