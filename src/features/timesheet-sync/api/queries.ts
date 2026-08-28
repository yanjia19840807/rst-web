import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { timesheetSyncApi } from '../api'
import type { TimesheetSyncOverviewQuery } from '../types'

export const timesheetSyncQueryKeys = {
  all: ['timesheet-sync'] as const,
  overview: (query: TimesheetSyncOverviewQuery) =>
    [...timesheetSyncQueryKeys.all, 'overview', query] as const,
  run: (id: string) => [...timesheetSyncQueryKeys.all, 'run', id] as const,
  alert: ['timesheet-sync', 'alert'] as const,
}

export function useTimesheetSyncOverviewQuery(
  query: MaybeRefOrGetter<TimesheetSyncOverviewQuery>,
) {
  const resolved = computed(() => toValue(query))
  return useQuery({
    queryKey: computed(() => timesheetSyncQueryKeys.overview(resolved.value)),
    queryFn: () => timesheetSyncApi.overview(resolved.value),
    placeholderData: keepPreviousData,
  })
}

export function useTimesheetSyncRunQuery(id: () => string | null) {
  return useQuery({
    queryKey: computed(() => timesheetSyncQueryKeys.run(id() ?? '')),
    queryFn: () => timesheetSyncApi.run(id()!),
    enabled: computed(() => Boolean(id())),
  })
}

export function useTimesheetSyncAlertQuery(enabled: () => boolean) {
  return useQuery({
    queryKey: timesheetSyncQueryKeys.alert,
    queryFn: () => timesheetSyncApi.alert(),
    enabled: computed(() => enabled()),
  })
}
