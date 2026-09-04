import { ApiError, apiHeaders, apiRequest } from '@/api/client'

import type {
  CalendarRequest,
  CalendarView,
  CommittedResultsStatus,
  CreateExerciseInput,
  CreateExerciseResult,
  CreateScenarioRequest,
  UpdateExercisePeriodsInput,
  UpdateExercisePeriodsResult,
  UpdateSlotPeriodInput,
  UpdateSlotPeriodResult,
  CycleTimeBaseline,
  CycleTimeBaselineFile,
  CycleTimeChartView,
  DailyVolume,
  DailyVolumeRequest,
  Exercise,
  ExerciseListQuery,
  ExerciseListView,
  ExerciseTmsSession,
  PatchExerciseTmsSessionResult,
  ManualBaselineRequest,
  PageResult,
  MonthlyVolume,
  MonthlyVolumeRequest,
  Scenario,
  ShiftRequest,
  SlotVolume,
  SlotVolumeRequest,
  CommitScenarioRequest,
  DailySizingView,
  ForecastTrainingBundle,
  ForecastView,
  MonthlySizingView,
  SizingPreviewBundle,
  SlotSimulationView,
  SubmitPreview,
  SubmitRequest,
  SubmittedDetails,
  SupportItem,
  SupportItemRequest,
  TeamSetup,
  TeamSetupRequest,
  ToolkitVolumePoints,
  UpdateScenarioRequest,
} from './types'

const base = '/api/v1/exercises'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function exercisePath(id: string, suffix = '') {
  return `${base}/${id}${suffix}`
}

async function downloadVolumeBlob(
  exerciseId: string,
  suffix: string,
  fallbackName: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE_URL}${exercisePath(exerciseId, suffix)}`, {
    headers: apiHeaders(undefined, { json: false }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ApiError(body?.detail || 'Download failed.', response.status)
  }
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = /filename="?([^"]+)"?/.exec(disposition)
  const filename = match?.[1] || fallbackName
  return { blob, filename }
}

async function uploadVolumeExcel<T>(exerciseId: string, suffix: string, file: File): Promise<T> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`${API_BASE_URL}${exercisePath(exerciseId, suffix)}`, {
    method: 'POST',
    headers: apiHeaders(undefined, { json: false }),
    body: form,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ApiError(body?.detail || 'Import failed.', response.status)
  }
  return response.json() as Promise<T>
}

function exerciseListQuery(params?: ExerciseListQuery) {
  const search = new URLSearchParams()
  if (params) {
    if (params.tab) search.set('tab', params.tab)
    const exerciseCode = params.exerciseCode?.trim()
    if (exerciseCode) search.set('exerciseCode', exerciseCode)
    if (params.toolkitName) search.set('toolkitName', params.toolkitName)
    if (params.pl3Name) search.set('pl3Name', params.pl3Name)
    if (params.workflowStatus) search.set('workflowStatus', params.workflowStatus)
    if (params.reviewStage) search.set('reviewStage', params.reviewStage)
    if (params.handler) search.set('handler', params.handler)
    if (params.officialScenario) search.set('officialScenario', params.officialScenario)
    if (params.createdFrom) search.set('createdFrom', params.createdFrom)
    if (params.createdTo) search.set('createdTo', params.createdTo)
    if (params.submittedFrom) search.set('submittedFrom', params.submittedFrom)
    if (params.submittedTo) search.set('submittedTo', params.submittedTo)
    if (params.archivedFrom) search.set('archivedFrom', params.archivedFrom)
    if (params.archivedTo) search.set('archivedTo', params.archivedTo)
  }
  search.set('page', String(params?.page ?? 1))
  search.set('pageSize', String(params?.pageSize ?? 10))
  return `?${search.toString()}`
}

export const exerciseApi = {
  list: (params?: ExerciseListQuery) =>
    apiRequest<ExerciseListView>(`${base}${exerciseListQuery(params)}`),
  create: (input: CreateExerciseInput) =>
    apiRequest<CreateExerciseResult>(base, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  detail: (id: string) => apiRequest<Exercise>(exercisePath(id)),
  updatePeriods: (id: string, body: UpdateExercisePeriodsInput) =>
    apiRequest<UpdateExercisePeriodsResult>(exercisePath(id, '/periods'), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  updateSlotPeriod: (id: string, body: UpdateSlotPeriodInput) =>
    apiRequest<UpdateSlotPeriodResult>(exercisePath(id, '/slot-period'), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  committedResults: (id: string) =>
    apiRequest<CommittedResultsStatus>(exercisePath(id, '/committed-results')),
  clearCommittedResults: (id: string) =>
    apiRequest<CommittedResultsStatus>(exercisePath(id, '/committed-results/clear'), {
      method: 'POST',
    }),
  delete: (id: string) =>
    apiRequest<void>(exercisePath(id), {
      method: 'DELETE',
    }),
  submitPreview: (id: string) =>
    apiRequest<SubmitPreview>(exercisePath(id, '/validations/submit-preview'), {
      method: 'POST',
    }),
  submit: (id: string, body: SubmitRequest = {}, idempotencyKey?: string) =>
    apiRequest<SubmittedDetails>(exercisePath(id, '/submit'), {
      method: 'POST',
      body: JSON.stringify(body),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    }),
  submittedDetails: (id: string) =>
    apiRequest<SubmittedDetails>(exercisePath(id, '/submitted-details')),
  withdraw: (id: string) =>
    apiRequest<SubmittedDetails>(exercisePath(id, '/withdraw'), {
      method: 'POST',
    }),

  getTeamSetup: (exerciseId: string) =>
    apiRequest<TeamSetup>(exercisePath(exerciseId, '/team-setup')),
  putTeamSetup: (exerciseId: string, body: TeamSetupRequest) =>
    apiRequest<TeamSetup>(exercisePath(exerciseId, '/team-setup'), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  listSupport: (exerciseId: string) =>
    apiRequest<SupportItem[]>(exercisePath(exerciseId, '/production-support')),
  createSupport: (exerciseId: string, body: SupportItemRequest) =>
    apiRequest<SupportItem>(exercisePath(exerciseId, '/production-support'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateSupport: (exerciseId: string, itemId: string, body: SupportItemRequest) =>
    apiRequest<SupportItem>(exercisePath(exerciseId, `/production-support/${itemId}`), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteSupport: (exerciseId: string, itemId: string) =>
    apiRequest<void>(exercisePath(exerciseId, `/production-support/${itemId}`), {
      method: 'DELETE',
    }),
  exportSupportTemplate: (exerciseId: string) =>
    downloadVolumeBlob(exerciseId, '/production-support/export-template', 'support-template.xlsx'),
  exportSupport: (exerciseId: string) =>
    downloadVolumeBlob(exerciseId, '/production-support/export', 'production-support.xlsx'),
  importSupport: (exerciseId: string, file: File) =>
    uploadVolumeExcel<SupportItem[]>(exerciseId, '/production-support/import', file),

  getCalendar: (exerciseId: string) =>
    apiRequest<CalendarView>(exercisePath(exerciseId, '/calendar')),
  putCalendar: (exerciseId: string, body: CalendarRequest) =>
    apiRequest<CalendarView>(exercisePath(exerciseId, '/calendar'), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  exportCalendarTemplate: (exerciseId: string) =>
    downloadVolumeBlob(exerciseId, '/calendar/export-template', 'calendar-template.xlsx'),
  exportCalendar: (exerciseId: string) =>
    downloadVolumeBlob(exerciseId, '/calendar/export', 'calendar.xlsx'),
  importCalendar: (exerciseId: string, file: File) =>
    uploadVolumeExcel<CalendarView>(exerciseId, '/calendar/import', file),

  getToolkitVolumePoints: (exerciseId: string) =>
    apiRequest<ToolkitVolumePoints>(exercisePath(exerciseId, '/volumes/toolkit-points')),
  getMonthlyVolumes: (exerciseId: string) =>
    apiRequest<MonthlyVolume[]>(exercisePath(exerciseId, '/volumes/monthly')),
  putMonthlyVolumes: (exerciseId: string, body: MonthlyVolumeRequest[]) =>
    apiRequest<MonthlyVolume[]>(exercisePath(exerciseId, '/volumes/monthly'), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  getDailyVolumes: (exerciseId: string) =>
    apiRequest<DailyVolume[]>(exercisePath(exerciseId, '/volumes/daily')),
  putDailyVolumes: (exerciseId: string, body: DailyVolumeRequest[]) =>
    apiRequest<DailyVolume[]>(exercisePath(exerciseId, '/volumes/daily'), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  getSlotVolumes: (exerciseId: string) =>
    apiRequest<SlotVolume[]>(exercisePath(exerciseId, '/volumes/slot')),
  putSlotVolumes: (exerciseId: string, body: SlotVolumeRequest[]) =>
    apiRequest<SlotVolume[]>(exercisePath(exerciseId, '/volumes/slot'), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  exportMonthlyVolumeTemplate: (exerciseId: string) =>
    downloadVolumeBlob(exerciseId, '/volumes/monthly/export-template', 'volume-monthly-template.xlsx'),
  exportMonthlyVolumes: (exerciseId: string) =>
    downloadVolumeBlob(exerciseId, '/volumes/monthly/export', 'volume-monthly.xlsx'),
  importMonthlyVolumes: (exerciseId: string, file: File) =>
    uploadVolumeExcel<MonthlyVolume[]>(exerciseId, '/volumes/monthly/import', file),

  exportDailyVolumeTemplate: (exerciseId: string) =>
    downloadVolumeBlob(exerciseId, '/volumes/daily/export-template', 'volume-daily-template.xlsx'),
  exportDailyVolumes: (exerciseId: string) =>
    downloadVolumeBlob(exerciseId, '/volumes/daily/export', 'volume-daily.xlsx'),
  importDailyVolumes: (exerciseId: string, file: File) =>
    uploadVolumeExcel<DailyVolume[]>(exerciseId, '/volumes/daily/import', file),

  exportSlotVolumeTemplate: (exerciseId: string) =>
    downloadVolumeBlob(exerciseId, '/volumes/slot/export-template', 'volume-slot-template.xlsx'),
  exportSlotVolumes: (exerciseId: string) =>
    downloadVolumeBlob(exerciseId, '/volumes/slot/export', 'volume-slot.xlsx'),
  importSlotVolumes: (exerciseId: string, file: File) =>
    uploadVolumeExcel<SlotVolume[]>(exerciseId, '/volumes/slot/import', file),

  getActiveCycleTime: (exerciseId: string) =>
    apiRequest<CycleTimeBaseline>(exercisePath(exerciseId, '/cycle-time/active')),
  createManualCycleTime: (exerciseId: string, body: ManualBaselineRequest) =>
    apiRequest<CycleTimeBaseline>(exercisePath(exerciseId, '/cycle-time/manual'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  uploadCycleTimeSupportFile: async (exerciseId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(
      `${API_BASE_URL}${exercisePath(exerciseId, '/cycle-time/support-files')}`,
      { method: 'POST', headers: apiHeaders(undefined, { json: false }), body: form },
    )
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null
      throw new ApiError(body?.detail || 'Support file upload failed.', response.status)
    }
    return response.json() as Promise<CycleTimeBaselineFile>
  },
  listExerciseTmsSessions: (exerciseId: string, page = 1, pageSize = 10) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })
    return apiRequest<PageResult<ExerciseTmsSession>>(
      `${exercisePath(exerciseId, '/cycle-time/sessions')}?${params}`,
    )
  },
  getCycleTimeChart: (exerciseId: string) =>
    apiRequest<CycleTimeChartView>(exercisePath(exerciseId, '/cycle-time/chart')),
  patchExerciseTmsSession: (
    exerciseId: string,
    sessionNo: string,
    included: boolean,
  ) =>
    apiRequest<PatchExerciseTmsSessionResult>(
      exercisePath(
        exerciseId,
        `/cycle-time/sessions/${encodeURIComponent(sessionNo)}`,
      ),
      {
        method: 'PATCH',
        body: JSON.stringify({ included }),
      },
    ),

  listScenarios: (exerciseId: string) =>
    apiRequest<Scenario[]>(exercisePath(exerciseId, '/scenarios')),
  createScenario: (exerciseId: string, body: CreateScenarioRequest) =>
    apiRequest<Scenario>(exercisePath(exerciseId, '/scenarios'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getScenario: (exerciseId: string, scenarioId: string) =>
    apiRequest<Scenario>(exercisePath(exerciseId, `/scenarios/${scenarioId}`)),
  updateScenario: (exerciseId: string, scenarioId: string, body: UpdateScenarioRequest) =>
    apiRequest<Scenario>(exercisePath(exerciseId, `/scenarios/${scenarioId}`), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  commitScenario: (exerciseId: string, scenarioId: string, body: CommitScenarioRequest) =>
    apiRequest<Scenario>(exercisePath(exerciseId, `/scenarios/${scenarioId}/commit`), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteScenario: (exerciseId: string, scenarioId: string) =>
    apiRequest<void>(exercisePath(exerciseId, `/scenarios/${scenarioId}`), {
      method: 'DELETE',
    }),
  markOfficial: (exerciseId: string, scenarioId: string) =>
    apiRequest<Scenario>(exercisePath(exerciseId, `/scenarios/${scenarioId}/official`), {
      method: 'POST',
    }),
  getLatestForecast: (
    exerciseId: string,
    scenarioId: string,
    level: 'MONTHLY' | 'DAILY' = 'MONTHLY',
  ) =>
    apiRequest<ForecastView>(
      exercisePath(
        exerciseId,
        `/scenarios/${scenarioId}/forecast/latest?level=${encodeURIComponent(level)}`,
      ),
    ),
  getForecastTraining: (exerciseId: string, scenarioId: string) =>
    apiRequest<ForecastTrainingBundle>(
      exercisePath(exerciseId, `/scenarios/${scenarioId}/forecast/training`),
    ),
  previewSizing: (exerciseId: string, scenarioId: string, rightSizingHc: number) =>
    apiRequest<SizingPreviewBundle>(
      exercisePath(exerciseId, `/scenarios/${scenarioId}/sizing:preview`),
      {
        method: 'POST',
        body: JSON.stringify({ rightSizingHc }),
      },
    ),
  getLatestMonthlySizing: (exerciseId: string, scenarioId: string) =>
    apiRequest<MonthlySizingView>(
      exercisePath(exerciseId, `/scenarios/${scenarioId}/simulations/monthly/latest`),
    ),
  getLatestDailySimulation: (exerciseId: string, scenarioId: string) =>
    apiRequest<DailySizingView>(
      exercisePath(exerciseId, `/scenarios/${scenarioId}/simulations/daily/latest`),
    ),
  runSlotSimulation: (exerciseId: string, scenarioId: string, shifts: ShiftRequest[]) =>
    apiRequest<SlotSimulationView>(
      exercisePath(exerciseId, `/scenarios/${scenarioId}/simulations/slot`),
      {
        method: 'POST',
        body: JSON.stringify({ shifts }),
      },
    ),
  getLatestSlotSimulation: (exerciseId: string, scenarioId: string) =>
    apiRequest<SlotSimulationView>(
      exercisePath(exerciseId, `/scenarios/${scenarioId}/simulations/slot/latest`),
    ),
}
