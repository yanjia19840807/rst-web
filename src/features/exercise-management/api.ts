import { ApiError, apiRequest } from '@/api/client'

import type { SupervisorToolkit } from '@/features/toolkit-management/types'

import type {
  CalendarRequest,
  CalendarView,
  CreateExerciseInput,
  CreateExerciseResult,
  CreateScenarioRequest,
  UpdateExercisePeriodsInput,
  UpdateExercisePeriodsResult,
  CycleTimeBaseline,
  CycleTimeBaselineFile,
  DailyVolume,
  DailyVolumeRequest,
  Exercise,
  ExerciseTmsSession,
  PatchExerciseTmsSessionResult,
  ManualBaselineRequest,
  PageResult,
  MonthlyVolume,
  MonthlyVolumeRequest,
  ReapplyCalendarResult,
  Scenario,
  Shift,
  ShiftRequest,
  SlotVolume,
  SlotVolumeRequest,
  CommitScenarioRequest,
  DailySizingView,
  ForecastBundle,
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
  UpdateScenarioRequest,
} from './types'

const base = '/api/v1/supervisor/exercises'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function exercisePath(id: string, suffix = '') {
  return `${base}/${id}${suffix}`
}

async function downloadVolumeBlob(exerciseId: string, suffix: string, fallbackName: string) {
  const response = await fetch(`${API_BASE_URL}${exercisePath(exerciseId, suffix)}`)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ApiError(body?.detail || 'Download failed.', response.status)
  }
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = /filename="?([^"]+)"?/.exec(disposition)
  const filename = match?.[1] || fallbackName
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function uploadVolumeExcel<T>(exerciseId: string, suffix: string, file: File): Promise<T> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`${API_BASE_URL}${exercisePath(exerciseId, suffix)}`, {
    method: 'POST',
    body: form,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ApiError(body?.detail || 'Import failed.', response.status)
  }
  return response.json() as Promise<T>
}

export const exerciseApi = {
  list: () => apiRequest<Exercise[]>(base),
  toolkits: () => apiRequest<SupervisorToolkit[]>('/api/v1/supervisor/toolkits'),
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

  getShifts: (exerciseId: string) =>
    apiRequest<Shift[]>(exercisePath(exerciseId, '/shifts')),
  putShifts: (exerciseId: string, body: ShiftRequest[]) =>
    apiRequest<Shift[]>(exercisePath(exerciseId, '/shifts'), {
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

  getCalendar: (exerciseId: string) =>
    apiRequest<CalendarView>(exercisePath(exerciseId, '/calendar')),
  putCalendar: (exerciseId: string, body: CalendarRequest) =>
    apiRequest<CalendarView>(exercisePath(exerciseId, '/calendar'), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  reapplyHolidayTemplate: (exerciseId: string) =>
    apiRequest<ReapplyCalendarResult>(exercisePath(exerciseId, '/calendar/reapply-template'), {
      method: 'POST',
    }),

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
      { method: 'POST', body: form },
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
  runForecast: (exerciseId: string, scenarioId: string) =>
    apiRequest<ForecastBundle>(exercisePath(exerciseId, `/scenarios/${scenarioId}/forecast:run`), {
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
