import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { approvalQueryKeys } from '@/features/approval/api/queries'
import { governanceQueryKeys } from '@/features/governance-reports/api/queries'

import { exerciseApi } from '../api'
import type {
  CalendarRequest,
  CreateExerciseInput,
  CreateScenarioRequest,
  DailyVolumeRequest,
  ManualBaselineRequest,
  MonthlyVolumeRequest,
  ShiftRequest,
  SlotVolumeRequest,
  SubmitRequest,
  SupportItemRequest,
  TeamSetupRequest,
  UpdateExercisePeriodsInput,
  UpdateScenarioRequest,
  CommitScenarioRequest,
} from '../types'
import { exerciseQueryKeys } from './queries'

function isExerciseScopedQuery(queryKey: readonly unknown[], exerciseId: string) {
  return (
    Array.isArray(queryKey) &&
    queryKey[0] === exerciseQueryKeys.all[0] &&
    queryKey.includes(exerciseId)
  )
}

export function useExerciseMutations() {
  const queryClient = useQueryClient()

  const refreshExercises = () =>
    queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.all })

  const create = useMutation({
    mutationFn: (input: CreateExerciseInput) => exerciseApi.create(input),
    onSuccess: refreshExercises,
  })

  const updatePeriods = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateExercisePeriodsInput }) =>
      exerciseApi.updatePeriods(id, body),
    onSuccess: (result) => {
      queryClient.setQueryData(exerciseQueryKeys.detail(result.exercise.id), result.exercise)
      void refreshExercises()
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => exerciseApi.delete(id),
    onSuccess: (_data, id) => {
      // Only refresh lists. Invalidating exerciseQueryKeys.all would refetch
      // still-mounted detail/Associated Data queries → 404 + error toasts.
      void queryClient.cancelQueries({
        predicate: (query) => isExerciseScopedQuery(query.queryKey, id),
      })
      void queryClient.invalidateQueries({
        queryKey: [...exerciseQueryKeys.all, 'list'],
      })
    },
  })

  const submit = useMutation({
    mutationFn: ({
      id,
      body,
      idempotencyKey,
    }: {
      id: string
      body?: SubmitRequest
      idempotencyKey?: string
    }) => exerciseApi.submit(id, body, idempotencyKey),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: exerciseQueryKeys.detail(variables.id),
      })
      void queryClient.invalidateQueries({
        queryKey: exerciseQueryKeys.submittedDetails(variables.id),
      })
      void queryClient.invalidateQueries({
        queryKey: exerciseQueryKeys.submitPreview(variables.id),
      })
      void queryClient.invalidateQueries({ queryKey: approvalQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: governanceQueryKeys.all })
      void refreshExercises()
    },
  })

  const withdraw = useMutation({
    mutationFn: (id: string) => exerciseApi.withdraw(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.detail(id) })
      void queryClient.invalidateQueries({
        queryKey: exerciseQueryKeys.submittedDetails(id),
      })
      void queryClient.invalidateQueries({ queryKey: approvalQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: governanceQueryKeys.all })
      void refreshExercises()
    },
  })

  return { create, updatePeriods, remove, submit, withdraw }
}

function invalidateExerciseAssociatedData(
  queryClient: ReturnType<typeof useQueryClient>,
  exerciseId: string,
) {
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.teamSetup(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.shifts(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.support(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.calendar(exerciseId) })
  void queryClient.invalidateQueries({
    queryKey: exerciseQueryKeys.volumesMonthly(exerciseId),
  })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.volumesDaily(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.volumesSlot(exerciseId) })
  void queryClient.invalidateQueries({
    queryKey: exerciseQueryKeys.cycleTimeActive(exerciseId),
  })
  void queryClient.invalidateQueries({
    queryKey: exerciseQueryKeys.cycleTimeChart(exerciseId),
  })
  void queryClient.invalidateQueries({
    queryKey: [...exerciseQueryKeys.all, 'tmsSessions', exerciseId],
  })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.detail(exerciseId) })
}

export function useExerciseAssociatedDataMutations() {
  const queryClient = useQueryClient()

  const putTeamSetup = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: TeamSetupRequest }) =>
      exerciseApi.putTeamSetup(exerciseId, body),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const putShifts = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: ShiftRequest[] }) =>
      exerciseApi.putShifts(exerciseId, body),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const createSupport = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: SupportItemRequest }) =>
      exerciseApi.createSupport(exerciseId, body),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const updateSupport = useMutation({
    mutationFn: ({
      exerciseId,
      itemId,
      body,
    }: {
      exerciseId: string
      itemId: string
      body: SupportItemRequest
    }) => exerciseApi.updateSupport(exerciseId, itemId, body),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const deleteSupport = useMutation({
    mutationFn: ({ exerciseId, itemId }: { exerciseId: string; itemId: string }) =>
      exerciseApi.deleteSupport(exerciseId, itemId),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const putCalendar = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: CalendarRequest }) =>
      exerciseApi.putCalendar(exerciseId, body),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const putMonthlyVolumes = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: MonthlyVolumeRequest[] }) =>
      exerciseApi.putMonthlyVolumes(exerciseId, body),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const putDailyVolumes = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: DailyVolumeRequest[] }) =>
      exerciseApi.putDailyVolumes(exerciseId, body),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const putSlotVolumes = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: SlotVolumeRequest[] }) =>
      exerciseApi.putSlotVolumes(exerciseId, body),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const createManualCycleTime = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: ManualBaselineRequest }) =>
      exerciseApi.createManualCycleTime(exerciseId, body),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const patchTmsSession = useMutation({
    mutationFn: ({
      exerciseId,
      sessionNo,
      included,
    }: {
      exerciseId: string
      sessionNo: string
      included: boolean
    }) => exerciseApi.patchExerciseTmsSession(exerciseId, sessionNo, included),
    onSuccess: (result, { exerciseId }) => {
      if (result.baseline) {
        queryClient.setQueryData(exerciseQueryKeys.cycleTimeActive(exerciseId), result.baseline)
      }
      void queryClient.invalidateQueries({
        queryKey: [...exerciseQueryKeys.all, 'tmsSessions', exerciseId],
      })
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.cycleTimeChart(exerciseId) })
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.teamSetup(exerciseId) })
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.cycleTimeActive(exerciseId) })
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.detail(exerciseId) })
    },
  })

  const importMonthlyVolumes = useMutation({
    mutationFn: ({ exerciseId, file }: { exerciseId: string; file: File }) =>
      exerciseApi.importMonthlyVolumes(exerciseId, file),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const importDailyVolumes = useMutation({
    mutationFn: ({ exerciseId, file }: { exerciseId: string; file: File }) =>
      exerciseApi.importDailyVolumes(exerciseId, file),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  const importSlotVolumes = useMutation({
    mutationFn: ({ exerciseId, file }: { exerciseId: string; file: File }) =>
      exerciseApi.importSlotVolumes(exerciseId, file),
    onSuccess: (_data, { exerciseId }) => invalidateExerciseAssociatedData(queryClient, exerciseId),
  })

  return {
    putTeamSetup,
    putShifts,
    createSupport,
    updateSupport,
    deleteSupport,
    putCalendar,
    putMonthlyVolumes,
    putDailyVolumes,
    putSlotVolumes,
    createManualCycleTime,
    patchTmsSession,
    importMonthlyVolumes,
    importDailyVolumes,
    importSlotVolumes,
  }
}

export function useScenarioMutations() {
  const queryClient = useQueryClient()

  const invalidateScenarios = (exerciseId: string) => {
    void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.scenarios(exerciseId) })
    void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.detail(exerciseId) })
    void queryClient.invalidateQueries({ queryKey: [...exerciseQueryKeys.all, 'list'] })
    void queryClient.invalidateQueries({
      queryKey: [...exerciseQueryKeys.all, 'scenario', exerciseId],
    })
    void queryClient.invalidateQueries({
      queryKey: [...exerciseQueryKeys.all, 'sim', exerciseId],
    })
  }

  const createScenario = useMutation({
    mutationFn: ({
      exerciseId,
      body,
    }: {
      exerciseId: string
      body: CreateScenarioRequest
    }) => exerciseApi.createScenario(exerciseId, body),
    onSuccess: (scenario, { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.scenario(exerciseId, scenario.id), scenario)
      invalidateScenarios(exerciseId)
    },
  })

  const updateScenario = useMutation({
    mutationFn: ({
      exerciseId,
      scenarioId,
      body,
    }: {
      exerciseId: string
      scenarioId: string
      body: UpdateScenarioRequest
    }) => exerciseApi.updateScenario(exerciseId, scenarioId, body),
    onSuccess: (scenario, { exerciseId, scenarioId }) => {
      queryClient.setQueryData(exerciseQueryKeys.scenario(exerciseId, scenarioId), scenario)
      invalidateScenarios(exerciseId)
    },
  })

  const commitScenario = useMutation({
    mutationFn: ({
      exerciseId,
      scenarioId,
      body,
    }: {
      exerciseId: string
      scenarioId: string
      body: CommitScenarioRequest
    }) => exerciseApi.commitScenario(exerciseId, scenarioId, body),
    onSuccess: (scenario, { exerciseId, scenarioId }) => {
      queryClient.setQueryData(exerciseQueryKeys.scenario(exerciseId, scenarioId), scenario)
      invalidateScenarios(exerciseId)
    },
  })

  const deleteScenario = useMutation({
    mutationFn: ({ exerciseId, scenarioId }: { exerciseId: string; scenarioId: string }) =>
      exerciseApi.deleteScenario(exerciseId, scenarioId),
    onSuccess: (_data, { exerciseId, scenarioId }) => {
      queryClient.removeQueries({
        queryKey: exerciseQueryKeys.scenario(exerciseId, scenarioId),
      })
      queryClient.removeQueries({
        queryKey: [...exerciseQueryKeys.all, 'sim', exerciseId, scenarioId],
      })
      invalidateScenarios(exerciseId)
    },
  })

  const markOfficial = useMutation({
    mutationFn: ({ exerciseId, scenarioId }: { exerciseId: string; scenarioId: string }) =>
      exerciseApi.markOfficial(exerciseId, scenarioId),
    onSuccess: (scenario, { exerciseId, scenarioId }) => {
      queryClient.setQueryData(exerciseQueryKeys.scenario(exerciseId, scenarioId), scenario)
      invalidateScenarios(exerciseId)
    },
  })

  return {
    createScenario,
    updateScenario,
    commitScenario,
    deleteScenario,
    markOfficial,
  }
}
