import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { timesheetSyncApi } from '../api'
import type {
  TimesheetSnapshotAssignmentsQuery,
  TimesheetSnapshotKpisQuery,
  TimesheetSnapshotPeopleQuery,
  TimesheetSnapshotPositionsQuery,
  TimesheetSnapshotScopesQuery,
  TimesheetSyncOverviewQuery,
  TimesheetSyncRunIssuesQuery,
} from '../types'

export const timesheetSyncQueryKeys = {
  all: ['timesheet-sync'] as const,
  overview: (query: TimesheetSyncOverviewQuery) =>
    [...timesheetSyncQueryKeys.all, 'overview', query] as const,
  run: (query: TimesheetSyncRunIssuesQuery) =>
    [...timesheetSyncQueryKeys.all, 'run', query] as const,
  alert: ['timesheet-sync', 'alert'] as const,
  tableFilters: ['timesheet-sync', 'tables', 'filters'] as const,
  people: (query: TimesheetSnapshotPeopleQuery) =>
    ['timesheet-sync', 'tables', 'people', query] as const,
  positions: (query: TimesheetSnapshotPositionsQuery) =>
    ['timesheet-sync', 'tables', 'positions', query] as const,
  scopes: (query: TimesheetSnapshotScopesQuery) =>
    ['timesheet-sync', 'tables', 'scopes', query] as const,
  assignments: (query: TimesheetSnapshotAssignmentsQuery) =>
    ['timesheet-sync', 'tables', 'assignments', query] as const,
  kpis: (query: TimesheetSnapshotKpisQuery) =>
    ['timesheet-sync', 'tables', 'kpis', query] as const,
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

export function useTimesheetSyncRunQuery(query: MaybeRefOrGetter<TimesheetSyncRunIssuesQuery | null>) {
  const resolved = computed(() => toValue(query))
  return useQuery({
    queryKey: computed(() =>
      timesheetSyncQueryKeys.run(resolved.value ?? { id: '', page: 1, pageSize: 10 }),
    ),
    queryFn: () => timesheetSyncApi.run(resolved.value!),
    enabled: computed(() => Boolean(resolved.value?.id)),
    placeholderData: keepPreviousData,
  })
}

export function useTimesheetSyncAlertQuery(enabled: () => boolean) {
  return useQuery({
    queryKey: timesheetSyncQueryKeys.alert,
    queryFn: () => timesheetSyncApi.alert(),
    enabled: computed(() => enabled()),
  })
}

export function useTimesheetSnapshotFiltersQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: timesheetSyncQueryKeys.tableFilters,
    queryFn: () => timesheetSyncApi.tableFilters(),
    enabled: computed(() => toValue(enabled)),
  })
}

export function useTimesheetSnapshotPeopleQuery(
  query: MaybeRefOrGetter<TimesheetSnapshotPeopleQuery>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const resolved = computed(() => toValue(query))
  return useQuery({
    queryKey: computed(() => timesheetSyncQueryKeys.people(resolved.value)),
    queryFn: () => timesheetSyncApi.people(resolved.value),
    enabled: computed(() => toValue(enabled)),
    placeholderData: keepPreviousData,
  })
}

export function useTimesheetSnapshotPositionsQuery(
  query: MaybeRefOrGetter<TimesheetSnapshotPositionsQuery>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const resolved = computed(() => toValue(query))
  return useQuery({
    queryKey: computed(() => timesheetSyncQueryKeys.positions(resolved.value)),
    queryFn: () => timesheetSyncApi.positions(resolved.value),
    enabled: computed(() => toValue(enabled)),
    placeholderData: keepPreviousData,
  })
}

export function useTimesheetSnapshotScopesQuery(
  query: MaybeRefOrGetter<TimesheetSnapshotScopesQuery>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const resolved = computed(() => toValue(query))
  return useQuery({
    queryKey: computed(() => timesheetSyncQueryKeys.scopes(resolved.value)),
    queryFn: () => timesheetSyncApi.scopes(resolved.value),
    enabled: computed(() => toValue(enabled)),
    placeholderData: keepPreviousData,
  })
}

export function useTimesheetSnapshotAssignmentsQuery(
  query: MaybeRefOrGetter<TimesheetSnapshotAssignmentsQuery>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const resolved = computed(() => toValue(query))
  return useQuery({
    queryKey: computed(() => timesheetSyncQueryKeys.assignments(resolved.value)),
    queryFn: () => timesheetSyncApi.assignments(resolved.value),
    enabled: computed(() => toValue(enabled)),
    placeholderData: keepPreviousData,
  })
}

export function useTimesheetSnapshotKpisQuery(
  query: MaybeRefOrGetter<TimesheetSnapshotKpisQuery>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const resolved = computed(() => toValue(query))
  return useQuery({
    queryKey: computed(() => timesheetSyncQueryKeys.kpis(resolved.value)),
    queryFn: () => timesheetSyncApi.kpis(resolved.value),
    enabled: computed(() => toValue(enabled)),
    placeholderData: keepPreviousData,
  })
}
