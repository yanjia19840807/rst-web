import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { holidayTemplateApi } from '../api'
import type { HolidayTemplateListQuery } from '../types'

export const holidayTemplateQueryKeys = {
  all: ['holiday-templates'] as const,
  list: (query: HolidayTemplateListQuery = {}) =>
    [...holidayTemplateQueryKeys.all, 'list', query] as const,
  detail: (id: string) => [...holidayTemplateQueryKeys.all, 'detail', id] as const,
}

export function useHolidayTemplatesQuery(
  filters: MaybeRefOrGetter<HolidayTemplateListQuery> = {},
) {
  const resolved = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => holidayTemplateQueryKeys.list(resolved.value)),
    queryFn: () => holidayTemplateApi.list(resolved.value),
    placeholderData: keepPreviousData,
  })
}

export function useHolidayTemplateQuery(id: MaybeRefOrGetter<string | undefined>) {
  const templateId = computed(() => toValue(id))
  return useQuery({
    queryKey: computed(() => holidayTemplateQueryKeys.detail(templateId.value ?? '')),
    queryFn: () => holidayTemplateApi.get(templateId.value!),
    enabled: computed(() => Boolean(templateId.value)),
  })
}
