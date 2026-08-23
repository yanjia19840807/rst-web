import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { timesheetApi } from '../api'
import type { TimesheetPeopleQuery } from '../types'

export const timesheetQueryKeys = {
  all: ['timesheet'] as const,
  people: (query: TimesheetPeopleQuery) => [...timesheetQueryKeys.all, 'people', query] as const,
}

export function useTimesheetPeopleQuery(
  query: MaybeRefOrGetter<TimesheetPeopleQuery>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const resolved = computed(() => toValue(query))
  return useQuery({
    queryKey: computed(() => timesheetQueryKeys.people(resolved.value)),
    queryFn: () => timesheetApi.people(resolved.value),
    enabled: computed(() => Boolean(toValue(enabled) && resolved.value.center.trim())),
    placeholderData: keepPreviousData,
  })
}
