import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { approvalQueryKeys } from '@/features/approval/api/queries'
import { governanceQueryKeys } from '@/features/governance-reports/api/queries'

import { exerciseApi } from '../api'
import type {
  CalendarRequest,
  CalendarView,
  CommitScenarioRequest,
  CommitScenarioResults,
  CreateExerciseInput,
  CreateScenarioRequest,
  CycleTimeBaseline,
  DailyVolume,
  DailyVolumeRequest,
  ManualBaselineRequest,
  MonthlyVolume,
  MonthlyVolumeRequest,
  ShiftRequest,
  SlotVolume,
  SlotVolumeRequest,
  SubmitRequest,
  SupportItemRequest,
  TeamSetup,
  TeamSetupRequest,
  UpdateExercisePeriodsInput,
  UpdateScenarioRequest,
  UpdateSlotPeriodInput,
} from '../types'
import { exerciseQueryKeys } from './queries'

type QueryClient = ReturnType<typeof useQueryClient>

function isExerciseScopedQuery(queryKey: readonly unknown[], exerciseId: string) {
  return (
    Array.isArray(queryKey) &&
    queryKey[0] === exerciseQueryKeys.all[0] &&
    queryKey.includes(exerciseId)
  )
}

function invalidateLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.lists() })
}

function invalidateDetailAndList(queryClient: QueryClient, exerciseId: string) {
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.detail(exerciseId) })
  invalidateLists(queryClient)
}

function invalidateSubmitPreview(queryClient: QueryClient, exerciseId: string) {
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.submitPreview(exerciseId) })
}

function invalidateSupportDerived(queryClient: QueryClient, exerciseId: string) {
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.support(exerciseId) })
  invalidateDetailAndList(queryClient, exerciseId)
  invalidateSubmitPreview(queryClient, exerciseId)
}

function writeCommittedSimulation(
  queryClient: QueryClient,
  exerciseId: string,
  scenarioId: string,
  results: CommitScenarioResults | null | undefined,
) {
  if (results == null) {
    queryClient.removeQueries({ queryKey: exerciseQueryKeys.simPrefix(exerciseId, scenarioId) })
    return
  }
  queryClient.setQueryData(exerciseQueryKeys.sim(exerciseId, scenarioId, 'monthly'), results.monthly)
  queryClient.setQueryData(exerciseQueryKeys.sim(exerciseId, scenarioId, 'daily'), results.daily)
  queryClient.setQueryData(
    exerciseQueryKeys.sim(exerciseId, scenarioId, 'forecast', 'MONTHLY'),
    results.forecast.monthly,
  )
  queryClient.setQueryData(
    exerciseQueryKeys.sim(exerciseId, scenarioId, 'forecast', 'DAILY'),
    results.forecast.daily,
  )
  queryClient.setQueryData(
    exerciseQueryKeys.sim(exerciseId, scenarioId, 'slot'),
    results.slot ?? null,
  )
}

function invalidateScenarioMeta(queryClient: QueryClient, exerciseId: string) {
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.scenarios(exerciseId) })
  invalidateDetailAndList(queryClient, exerciseId)
}

function invalidateAfterDecision(queryClient: QueryClient, exerciseId: string) {
  invalidateDetailAndList(queryClient, exerciseId)
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.submittedDetails(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.submitPreview(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: approvalQueryKeys.queues() })
  void queryClient.invalidateQueries({ queryKey: governanceQueryKeys.all })
}

function invalidateAfterPeriodsChange(queryClient: QueryClient, exerciseId: string) {
  invalidateLists(queryClient)
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.calendar(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.volumesMonthly(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.volumesDaily(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.volumesSlot(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.teamSetup(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.support(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.cycleTimeActive(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.cycleTimeChart(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.tmsSessionsPrefix(exerciseId) })
  void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.simPrefix(exerciseId) })
  void queryClient.invalidateQueries({
    queryKey: exerciseQueryKeys.forecastTrainingPrefix(exerciseId),
  })
  invalidateSubmitPreview(queryClient, exerciseId)
}

export function useExerciseMutations() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: (input: CreateExerciseInput) => exerciseApi.create(input),
    onSuccess: () => invalidateLists(queryClient),
  })

  const updatePeriods = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateExercisePeriodsInput }) =>
      exerciseApi.updatePeriods(id, body),
    onSuccess: (result) => {
      queryClient.setQueryData(exerciseQueryKeys.detail(result.exercise.id), result.exercise)
      queryClient.setQueryData(exerciseQueryKeys.committedResults(result.exercise.id), {
        scenarioCount: 0,
      })
      invalidateAfterPeriodsChange(queryClient, result.exercise.id)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => exerciseApi.delete(id),
    onSuccess: (_data, id) => {
      void queryClient.cancelQueries({
        predicate: (query) => isExerciseScopedQuery(query.queryKey, id),
      })
      invalidateLists(queryClient)
    },
  })

  const clearCommittedResults = useMutation({
    mutationFn: (id: string) => exerciseApi.clearCommittedResults(id),
    onSuccess: (status, id) => {
      queryClient.setQueryData(exerciseQueryKeys.committedResults(id), status)
      queryClient.removeQueries({ queryKey: exerciseQueryKeys.simPrefix(id) })
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
    onSuccess: (_data, { id }) => invalidateAfterDecision(queryClient, id),
  })

  const withdraw = useMutation({
    mutationFn: (id: string) => exerciseApi.withdraw(id),
    onSuccess: (_data, id) => invalidateAfterDecision(queryClient, id),
  })

  return { create, updatePeriods, remove, clearCommittedResults, submit, withdraw }
}

export function useExerciseAssociatedDataMutations() {
  const queryClient = useQueryClient()

  const putTeamSetup = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: TeamSetupRequest }) =>
      exerciseApi.putTeamSetup(exerciseId, body),
    onSuccess: (setup: TeamSetup, { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.teamSetup(exerciseId), setup)
      invalidateSupportDerived(queryClient, exerciseId)
    },
  })

  const createSupport = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: SupportItemRequest }) =>
      exerciseApi.createSupport(exerciseId, body),
    onSuccess: (_data, { exerciseId }) => invalidateSupportDerived(queryClient, exerciseId),
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
    onSuccess: (_data, { exerciseId }) => invalidateSupportDerived(queryClient, exerciseId),
  })

  const deleteSupport = useMutation({
    mutationFn: ({ exerciseId, itemId }: { exerciseId: string; itemId: string }) =>
      exerciseApi.deleteSupport(exerciseId, itemId),
    onSuccess: (_data, { exerciseId }) => invalidateSupportDerived(queryClient, exerciseId),
  })

  const putCalendar = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: CalendarRequest }) =>
      exerciseApi.putCalendar(exerciseId, body),
    onSuccess: (calendar: CalendarView, { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.calendar(exerciseId), calendar)
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.teamSetup(exerciseId) })
      invalidateSupportDerived(queryClient, exerciseId)
    },
  })

  const importCalendar = useMutation({
    mutationFn: ({ exerciseId, file }: { exerciseId: string; file: File }) =>
      exerciseApi.importCalendar(exerciseId, file),
    onSuccess: (calendar: CalendarView, { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.calendar(exerciseId), calendar)
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.teamSetup(exerciseId) })
      invalidateSupportDerived(queryClient, exerciseId)
    },
  })

  const putMonthlyVolumes = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: MonthlyVolumeRequest[] }) =>
      exerciseApi.putMonthlyVolumes(exerciseId, body),
    onSuccess: (rows: MonthlyVolume[], { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.volumesMonthly(exerciseId), rows)
      invalidateSubmitPreview(queryClient, exerciseId)
    },
  })

  const putDailyVolumes = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: DailyVolumeRequest[] }) =>
      exerciseApi.putDailyVolumes(exerciseId, body),
    onSuccess: (rows: DailyVolume[], { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.volumesDaily(exerciseId), rows)
      invalidateSubmitPreview(queryClient, exerciseId)
    },
  })

  const putSlotVolumes = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: SlotVolumeRequest[] }) =>
      exerciseApi.putSlotVolumes(exerciseId, body),
    onSuccess: (rows: SlotVolume[], { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.volumesSlot(exerciseId), rows)
      invalidateSubmitPreview(queryClient, exerciseId)
    },
  })

  const updateSlotPeriod = useMutation({
    mutationFn: ({
      exerciseId,
      body,
    }: {
      exerciseId: string
      body: UpdateSlotPeriodInput
    }) => exerciseApi.updateSlotPeriod(exerciseId, body),
    onSuccess: (result, { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.detail(result.exercise.id), result.exercise)
      queryClient.setQueryData(exerciseQueryKeys.volumesSlot(exerciseId), result.volumes)
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.simPrefix(exerciseId) })
      invalidateSubmitPreview(queryClient, exerciseId)
    },
  })

  const importMonthlyVolumes = useMutation({
    mutationFn: ({ exerciseId, file }: { exerciseId: string; file: File }) =>
      exerciseApi.importMonthlyVolumes(exerciseId, file),
    onSuccess: (rows: MonthlyVolume[], { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.volumesMonthly(exerciseId), rows)
      invalidateSubmitPreview(queryClient, exerciseId)
    },
  })

  const importDailyVolumes = useMutation({
    mutationFn: ({ exerciseId, file }: { exerciseId: string; file: File }) =>
      exerciseApi.importDailyVolumes(exerciseId, file),
    onSuccess: (rows: DailyVolume[], { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.volumesDaily(exerciseId), rows)
      invalidateSubmitPreview(queryClient, exerciseId)
    },
  })

  const importSlotVolumes = useMutation({
    mutationFn: ({ exerciseId, file }: { exerciseId: string; file: File }) =>
      exerciseApi.importSlotVolumes(exerciseId, file),
    onSuccess: (rows: SlotVolume[], { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.volumesSlot(exerciseId), rows)
      invalidateSubmitPreview(queryClient, exerciseId)
    },
  })

  const createManualCycleTime = useMutation({
    mutationFn: ({ exerciseId, body }: { exerciseId: string; body: ManualBaselineRequest }) =>
      exerciseApi.createManualCycleTime(exerciseId, body),
    onSuccess: (baseline: CycleTimeBaseline, { exerciseId }) => {
      queryClient.setQueryData(exerciseQueryKeys.cycleTimeActive(exerciseId), baseline)
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.cycleTimeChart(exerciseId) })
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.teamSetup(exerciseId) })
      invalidateSubmitPreview(queryClient, exerciseId)
    },
  })

  const uploadCycleTimeSupportFile = useMutation({
    mutationFn: ({ exerciseId, file }: { exerciseId: string; file: File }) =>
      exerciseApi.uploadCycleTimeSupportFile(exerciseId, file),
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
        queryKey: exerciseQueryKeys.tmsSessionsPrefix(exerciseId),
      })
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.cycleTimeChart(exerciseId) })
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.teamSetup(exerciseId) })
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.cycleTimeActive(exerciseId) })
      invalidateSubmitPreview(queryClient, exerciseId)
    },
  })

  return {
    putTeamSetup,
    createSupport,
    updateSupport,
    deleteSupport,
    putCalendar,
    importCalendar,
    putMonthlyVolumes,
    putDailyVolumes,
    putSlotVolumes,
    updateSlotPeriod,
    createManualCycleTime,
    uploadCycleTimeSupportFile,
    patchTmsSession,
    importMonthlyVolumes,
    importDailyVolumes,
    importSlotVolumes,
  }
}

export function useScenarioMutations() {
  const queryClient = useQueryClient()

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
      invalidateScenarioMeta(queryClient, exerciseId)
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
      invalidateScenarioMeta(queryClient, exerciseId)
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
    onSuccess: (scenario, { exerciseId, scenarioId, body }) => {
      queryClient.setQueryData(exerciseQueryKeys.scenario(exerciseId, scenarioId), scenario)
      writeCommittedSimulation(queryClient, exerciseId, scenarioId, body.results)
      void queryClient.invalidateQueries({
        queryKey: exerciseQueryKeys.committedResults(exerciseId),
      })
      invalidateScenarioMeta(queryClient, exerciseId)
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
        queryKey: exerciseQueryKeys.simPrefix(exerciseId, scenarioId),
      })
      void queryClient.invalidateQueries({
        queryKey: exerciseQueryKeys.committedResults(exerciseId),
      })
      invalidateScenarioMeta(queryClient, exerciseId)
    },
  })

  const markOfficial = useMutation({
    mutationFn: ({ exerciseId, scenarioId }: { exerciseId: string; scenarioId: string }) =>
      exerciseApi.markOfficial(exerciseId, scenarioId),
    onSuccess: (scenario, { exerciseId, scenarioId }) => {
      queryClient.setQueryData(exerciseQueryKeys.scenario(exerciseId, scenarioId), scenario)
      void queryClient.invalidateQueries({
        queryKey: exerciseQueryKeys.scenarioPrefix(exerciseId),
      })
      invalidateScenarioMeta(queryClient, exerciseId)
    },
  })

  const previewSizing = useMutation({
    mutationFn: ({
      exerciseId,
      scenarioId,
      rightSizingHc,
    }: {
      exerciseId: string
      scenarioId: string
      rightSizingHc: number
    }) => exerciseApi.previewSizing(exerciseId, scenarioId, rightSizingHc),
  })

  const runSlotSimulation = useMutation({
    mutationFn: ({
      exerciseId,
      scenarioId,
      shifts,
    }: {
      exerciseId: string
      scenarioId: string
      shifts: ShiftRequest[]
    }) => exerciseApi.runSlotSimulation(exerciseId, scenarioId, shifts),
  })

  return {
    createScenario,
    updateScenario,
    commitScenario,
    deleteScenario,
    markOfficial,
    previewSizing,
    runSlotSimulation,
  }
}
