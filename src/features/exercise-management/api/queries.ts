import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { ApiError } from '@/api/client'

import { exerciseApi } from '../api'
import type { ExerciseListQuery, SupportItem } from '../types'

export type SimulationKind = 'monthly' | 'daily' | 'slot' | 'forecast'
export type ForecastLevel = 'MONTHLY' | 'DAILY'

export const exerciseQueryKeys = {
  all: ['exercises'] as const,
  lists: () => [...exerciseQueryKeys.all, 'list'] as const,
  list: (query: ExerciseListQuery = {}) => [...exerciseQueryKeys.all, 'list', query] as const,
  detail: (id: string) => [...exerciseQueryKeys.all, 'detail', id] as const,
  scenarios: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'scenarios', exerciseId] as const,
  scenarioPrefix: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'scenario', exerciseId] as const,
  scenario: (exerciseId: string, scenarioId: string) =>
    [...exerciseQueryKeys.all, 'scenario', exerciseId, scenarioId] as const,
  teamSetup: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'teamSetup', exerciseId] as const,
  support: (exerciseId: string) => [...exerciseQueryKeys.all, 'support', exerciseId] as const,
  calendar: (exerciseId: string) => [...exerciseQueryKeys.all, 'calendar', exerciseId] as const,
  volumesMonthly: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'volumes', 'monthly', exerciseId] as const,
  volumesDaily: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'volumes', 'daily', exerciseId] as const,
  volumesSlot: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'volumes', 'slot', exerciseId] as const,
  volumesToolkitPoints: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'volumes', 'toolkit-points', exerciseId] as const,
  cycleTimeActive: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'cycleTime', 'active', exerciseId] as const,
  cycleTimeChart: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'cycleTime', 'chart', exerciseId] as const,
  tmsSessionsPrefix: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'tmsSessions', exerciseId] as const,
  tmsSessions: (exerciseId: string, page: number, pageSize: number) =>
    [...exerciseQueryKeys.all, 'tmsSessions', exerciseId, page, pageSize] as const,
  simPrefix: (exerciseId: string, scenarioId?: string) =>
    scenarioId
      ? ([...exerciseQueryKeys.all, 'sim', exerciseId, scenarioId] as const)
      : ([...exerciseQueryKeys.all, 'sim', exerciseId] as const),
  sim: (
    exerciseId: string,
    scenarioId: string,
    kind: SimulationKind,
    level?: ForecastLevel,
  ) =>
    [...exerciseQueryKeys.all, 'sim', exerciseId, scenarioId, kind, level ?? ''] as const,
  forecastTrainingPrefix: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'forecastTraining', exerciseId] as const,
  forecastTraining: (exerciseId: string, scenarioId: string) =>
    [...exerciseQueryKeys.all, 'forecastTraining', exerciseId, scenarioId] as const,
  committedResults: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'committedResults', exerciseId] as const,
  submitPreview: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'submitPreview', exerciseId] as const,
  submittedDetails: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'submittedDetails', exerciseId] as const,
}

export function useExercisesQuery(filters: MaybeRefOrGetter<ExerciseListQuery> = {}) {
  const resolved = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.list(resolved.value)),
    queryFn: () => exerciseApi.list(resolved.value),
    placeholderData: keepPreviousData,
  })
}

export function useCommittedResultsQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.committedResults(id.value ?? '')),
    queryFn: () => exerciseApi.committedResults(id.value!),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useExerciseQuery(id: MaybeRefOrGetter<string | undefined>) {
  const exerciseId = computed(() => toValue(id))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.detail(exerciseId.value ?? '')),
    queryFn: () => exerciseApi.detail(exerciseId.value!),
    enabled: computed(() => Boolean(exerciseId.value)),
  })
}

export function useExerciseScenariosQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.scenarios(id.value ?? '')),
    queryFn: () => exerciseApi.listScenarios(id.value!),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useTeamSetupQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.teamSetup(id.value ?? '')),
    queryFn: async () => {
      try {
        return await exerciseApi.getTeamSetup(id.value!)
      } catch {
        return null
      }
    },
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useSupportQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.support(id.value ?? '')),
    queryFn: async () => {
      try {
        return await exerciseApi.listSupport(id.value!)
      } catch {
        return [] as SupportItem[]
      }
    },
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useCalendarQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.calendar(id.value ?? '')),
    queryFn: () => exerciseApi.getCalendar(id.value!),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useToolkitVolumePointsQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.volumesToolkitPoints(id.value ?? '')),
    queryFn: () => exerciseApi.getToolkitVolumePoints(id.value!),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useMonthlyVolumesQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.volumesMonthly(id.value ?? '')),
    queryFn: () => exerciseApi.getMonthlyVolumes(id.value!),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useDailyVolumesQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.volumesDaily(id.value ?? '')),
    queryFn: () => exerciseApi.getDailyVolumes(id.value!),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useSlotVolumesQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.volumesSlot(id.value ?? '')),
    queryFn: () => exerciseApi.getSlotVolumes(id.value!),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useCycleTimeActiveQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.cycleTimeActive(id.value ?? '')),
    queryFn: async () => {
      try {
        return await exerciseApi.getActiveCycleTime(id.value!)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
    enabled: computed(() => Boolean(id.value) && id.value !== 'undefined'),
  })
}

export function useCycleTimeChartQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.cycleTimeChart(id.value ?? '')),
    queryFn: () => exerciseApi.getCycleTimeChart(id.value!),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useSubmittedDetailsQuery(
  exerciseId: MaybeRefOrGetter<string | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const id = computed(() => toValue(exerciseId))
  const isEnabled = computed(() => Boolean(id.value) && toValue(enabled))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.submittedDetails(id.value ?? '')),
    queryFn: () => exerciseApi.submittedDetails(id.value!),
    enabled: isEnabled,
  })
}

export function useExerciseTmsSessionsQuery(
  exerciseId: MaybeRefOrGetter<string | undefined>,
  page: MaybeRefOrGetter<number>,
  pageSize: MaybeRefOrGetter<number>,
) {
  const id = computed(() => toValue(exerciseId))
  const resolvedPage = computed(() => toValue(page))
  const resolvedPageSize = computed(() => toValue(pageSize))
  return useQuery({
    queryKey: computed(() =>
      exerciseQueryKeys.tmsSessions(id.value ?? '', resolvedPage.value, resolvedPageSize.value),
    ),
    queryFn: () =>
      exerciseApi.listExerciseTmsSessions(id.value!, resolvedPage.value, resolvedPageSize.value),
    enabled: computed(() => Boolean(id.value)),
    placeholderData: keepPreviousData,
  })
}

export function useScenarioQuery(
  exerciseId: MaybeRefOrGetter<string | undefined>,
  scenarioId: MaybeRefOrGetter<string | undefined>,
  options: { optional?: MaybeRefOrGetter<boolean> } = {},
) {
  const exId = computed(() => toValue(exerciseId))
  const scId = computed(() => toValue(scenarioId))
  const optional = computed(() => Boolean(toValue(options.optional)))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.scenario(exId.value ?? '', scId.value ?? '')),
    queryFn: async () => {
      try {
        return await exerciseApi.getScenario(exId.value!, scId.value!)
      } catch (error) {
        if (optional.value) return null
        throw error
      }
    },
    enabled: computed(() => Boolean(exId.value && scId.value)),
  })
}

export function useLatestMonthlySizingQuery(
  exerciseId: MaybeRefOrGetter<string | undefined>,
  scenarioId: MaybeRefOrGetter<string | undefined>,
) {
  const exId = computed(() => toValue(exerciseId))
  const scId = computed(() => toValue(scenarioId))
  return useQuery({
    queryKey: computed(() =>
      exerciseQueryKeys.sim(exId.value ?? '', scId.value ?? '', 'monthly'),
    ),
    queryFn: () =>
      exerciseApi.getLatestMonthlySizing(exId.value!, scId.value!).catch(() => null),
    enabled: computed(() => Boolean(exId.value && scId.value)),
  })
}

export function useLatestDailySimulationQuery(
  exerciseId: MaybeRefOrGetter<string | undefined>,
  scenarioId: MaybeRefOrGetter<string | undefined>,
) {
  const exId = computed(() => toValue(exerciseId))
  const scId = computed(() => toValue(scenarioId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.sim(exId.value ?? '', scId.value ?? '', 'daily')),
    queryFn: () =>
      exerciseApi.getLatestDailySimulation(exId.value!, scId.value!).catch(() => null),
    enabled: computed(() => Boolean(exId.value && scId.value)),
  })
}

export function useLatestSlotSimulationQuery(
  exerciseId: MaybeRefOrGetter<string | undefined>,
  scenarioId: MaybeRefOrGetter<string | undefined>,
) {
  const exId = computed(() => toValue(exerciseId))
  const scId = computed(() => toValue(scenarioId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.sim(exId.value ?? '', scId.value ?? '', 'slot')),
    queryFn: () =>
      exerciseApi.getLatestSlotSimulation(exId.value!, scId.value!).catch(() => null),
    enabled: computed(() => Boolean(exId.value && scId.value)),
  })
}

export function useLatestForecastQuery(
  exerciseId: MaybeRefOrGetter<string | undefined>,
  scenarioId: MaybeRefOrGetter<string | undefined>,
  level: MaybeRefOrGetter<ForecastLevel>,
) {
  const exId = computed(() => toValue(exerciseId))
  const scId = computed(() => toValue(scenarioId))
  const resolvedLevel = computed(() => toValue(level))
  return useQuery({
    queryKey: computed(() =>
      exerciseQueryKeys.sim(
        exId.value ?? '',
        scId.value ?? '',
        'forecast',
        resolvedLevel.value,
      ),
    ),
    queryFn: () =>
      exerciseApi
        .getLatestForecast(exId.value!, scId.value!, resolvedLevel.value)
        .catch(() => null),
    enabled: computed(() => Boolean(exId.value && scId.value)),
  })
}

export function useForecastTrainingQuery(
  exerciseId: MaybeRefOrGetter<string | undefined>,
  scenarioId: MaybeRefOrGetter<string | undefined>,
) {
  const exId = computed(() => toValue(exerciseId))
  const scId = computed(() => toValue(scenarioId))
  return useQuery({
    queryKey: computed(() =>
      exerciseQueryKeys.forecastTraining(exId.value ?? '', scId.value ?? ''),
    ),
    queryFn: () => exerciseApi.getForecastTraining(exId.value!, scId.value!),
    enabled: computed(() => Boolean(exId.value && scId.value)),
  })
}

export function useSubmitPreviewQuery(
  exerciseId: MaybeRefOrGetter<string | undefined>,
  enabled: MaybeRefOrGetter<boolean> = false,
) {
  const id = computed(() => toValue(exerciseId))
  const isEnabled = computed(() => Boolean(id.value) && toValue(enabled))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.submitPreview(id.value ?? '')),
    queryFn: () => exerciseApi.submitPreview(id.value!),
    enabled: isEnabled,
    staleTime: 0,
  })
}
