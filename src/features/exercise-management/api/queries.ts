import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { exerciseApi } from '../api'
import type { ExerciseListQuery, SupportItem } from '../types'

export const exerciseQueryKeys = {
  all: ['exercises'] as const,
  list: (query: ExerciseListQuery = {}) => [...exerciseQueryKeys.all, 'list', query] as const,
  detail: (id: string) => [...exerciseQueryKeys.all, 'detail', id] as const,
  scenarios: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'scenarios', exerciseId] as const,
  teamSetup: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'teamSetup', exerciseId] as const,
  shifts: (exerciseId: string) => [...exerciseQueryKeys.all, 'shifts', exerciseId] as const,
  support: (exerciseId: string) => [...exerciseQueryKeys.all, 'support', exerciseId] as const,
  calendar: (exerciseId: string) => [...exerciseQueryKeys.all, 'calendar', exerciseId] as const,
  volumesMonthly: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'volumes', 'monthly', exerciseId] as const,
  volumesDaily: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'volumes', 'daily', exerciseId] as const,
  volumesSlot: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'volumes', 'slot', exerciseId] as const,
  cycleTimeActive: (exerciseId: string) =>
    [...exerciseQueryKeys.all, 'cycleTime', 'active', exerciseId] as const,
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

export function useShiftsQuery(exerciseId: MaybeRefOrGetter<string | undefined>) {
  const id = computed(() => toValue(exerciseId))
  return useQuery({
    queryKey: computed(() => exerciseQueryKeys.shifts(id.value ?? '')),
    queryFn: () => exerciseApi.getShifts(id.value!),
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
      } catch {
        return null
      }
    },
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
