import { apiRequest } from '@/api/client'

import type { SupervisorToolkit } from '@/features/toolkit-management/types'

import type {
  CalendarRequest,
  CalendarView,
  CreateExerciseInput,
  CreateScenarioRequest,
  CycleTimeBaseline,
  DailyVolume,
  DailyVolumeRequest,
  Exercise,
  ManualBaselineRequest,
  MonthlyVolume,
  MonthlyVolumeRequest,
  Scenario,
  Shift,
  ShiftRequest,
  SlotVolume,
  SlotVolumeRequest,
  StubRun,
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

function exercisePath(id: string, suffix = '') {
  return `${base}/${id}${suffix}`
}

export const exerciseApi = {
  list: () => apiRequest<Exercise[]>(base),
  toolkits: () => apiRequest<SupervisorToolkit[]>('/api/v1/supervisor/toolkits'),
  create: (input: CreateExerciseInput) =>
    apiRequest<Exercise>(base, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  detail: (id: string) => apiRequest<Exercise>(exercisePath(id)),
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

  getActiveCycleTime: (exerciseId: string) =>
    apiRequest<CycleTimeBaseline>(exercisePath(exerciseId, '/cycle-time/active')),
  createManualCycleTime: (exerciseId: string, body: ManualBaselineRequest) =>
    apiRequest<CycleTimeBaseline>(exercisePath(exerciseId, '/cycle-time/manual'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

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
  deleteScenario: (exerciseId: string, scenarioId: string) =>
    apiRequest<void>(exercisePath(exerciseId, `/scenarios/${scenarioId}`), {
      method: 'DELETE',
    }),
  markOfficial: (exerciseId: string, scenarioId: string) =>
    apiRequest<Scenario>(exercisePath(exerciseId, `/scenarios/${scenarioId}/official`), {
      method: 'POST',
    }),
  runForecast: (exerciseId: string, scenarioId: string) =>
    apiRequest<StubRun>(exercisePath(exerciseId, `/scenarios/${scenarioId}/forecast:run`), {
      method: 'POST',
    }),
  runMonthlySimulation: (exerciseId: string, scenarioId: string) =>
    apiRequest<StubRun>(
      exercisePath(exerciseId, `/scenarios/${scenarioId}/simulations/monthly`),
      { method: 'POST' },
    ),
  runSlotSimulation: (exerciseId: string, scenarioId: string) =>
    apiRequest<StubRun>(exercisePath(exerciseId, `/scenarios/${scenarioId}/simulations/slot`), {
      method: 'POST',
    }),
}
