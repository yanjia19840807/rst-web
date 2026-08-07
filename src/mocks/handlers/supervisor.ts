import { delay, http, HttpResponse } from 'msw'

import type {
  CalendarRequest,
  CreateExerciseInput,
  CreateScenarioRequest,
  DailyVolumeRequest,
  Exercise,
  ManualBaselineRequest,
  MonthlyVolumeRequest,
  ShiftRequest,
  SlotVolumeRequest,
  SubmitRequest,
  SupportItemRequest,
  TeamSetupRequest,
  UpdateScenarioRequest,
} from '@/features/exercise-management/types'
import type {
  SharedKpiCandidate,
  SharedKpiKey,
  SupervisorToolkit,
  ToolkitEditorPayload,
} from '@/features/toolkit-management/types'

import {
  activeTimesheetSyncDate,
  exercises,
  hierarchy,
  kpiCandidates,
  supervisorPositionId,
  supervisorToolkits,
} from '../data/supervisor'
import { ensureShell, exerciseShells, recomputeTeamSetup } from '../data/exercise-store'

function problem(status: number, detail: string) {
  return HttpResponse.json({ title: 'Supervisor request failed', status, detail }, { status })
}

function sameKey(a: SharedKpiKey, b: SharedKpiKey) {
  return a.carrier === b.carrier && a.site === b.site && a.customerCountry === b.customerCountry
}

function resolvedKpis(toolkit: SupervisorToolkit): SharedKpiCandidate[] {
  const candidates = kpiCandidates(toolkit.pl3Code)
  return toolkit.sharedKpiSelections.map((selection) => {
    const current = candidates.find((candidate) => sameKey(candidate, selection))
    return current ?? { ...selection, deliveryHc: 0, valid: false }
  })
}

function snapshot(toolkit: SupervisorToolkit): Exercise['snapshot'] {
  return {
    toolkit: {
      id: toolkit.id,
      name: toolkit.name,
      center: toolkit.center,
      domain: toolkit.domain,
      pl1: toolkit.pl1,
      pl2: toolkit.pl2,
      pl3Code: toolkit.pl3Code,
      pl3Name: toolkit.pl3Name,
      combineSubtasksTime: toolkit.combineSubtasksTime,
      version: toolkit.version,
    },
    subtasks: toolkit.subtasks
      .filter((item) => !item.deletedAt)
      .map((item) => ({
        id: crypto.randomUUID(),
        sourceToolkitSubtaskId: item.id,
        name: item.name,
        description: item.description,
        displayOrder: item.displayOrder,
        deletedAt: null,
      })),
    sharedKpis: resolvedKpis(toolkit).map((item) => ({
      id: crypto.randomUUID(),
      sourceSelectionId: null,
      carrier: item.carrier,
      site: item.site,
      customerCountry: item.customerCountry,
      deliveryHc: item.deliveryHc,
      valid: item.valid,
    })),
    timesheetSyncDate: activeTimesheetSyncDate,
  }
}

function findExercise(id: string | readonly string[] | undefined) {
  return exercises.find((item) => item.id === id)
}

function requireExercise(id: string | readonly string[] | undefined) {
  const exercise = findExercise(id)
  if (!exercise) return null
  return { exercise, shell: ensureShell(exercise) }
}

function editable(exercise: Exercise) {
  return exercise.canEdit && (exercise.workflowStatus === 'IN_PROGRESS' || exercise.workflowStatus === 'RETURNED')
}

function syncFlags(exercise: Exercise) {
  const shell = ensureShell(exercise)
  exercise.officialScenarioId =
    shell.scenarios.find((item) => item.status === 'OFFICIAL')?.id ?? null
  exercise.canEdit = exercise.workflowStatus === 'IN_PROGRESS' || exercise.workflowStatus === 'RETURNED'
  exercise.canDelete = exercise.canEdit && !exercise.submittedAt
  exercise.canSubmit = Boolean(exercise.officialScenarioId) && exercise.canEdit
}

const OPEN_LIKE_STATUSES = new Set(['AWAITING_MANAGER', 'AWAITING_CDH', 'AWAITING_LTH'])

export const supervisorHandlers = [
  http.get('*/api/v1/timesheet/toolkit-hierarchy', () => HttpResponse.json(hierarchy)),

  http.get('*/api/v1/timesheet/shared-kpi-candidates', ({ request }) => {
    const url = new URL(request.url)
    const pl3Code = url.searchParams.get('pl3Code') ?? ''
    const countries = url.searchParams.getAll('customerCountry')
    const items = kpiCandidates(pl3Code).filter(
      (item) => !countries.length || countries.includes(item.customerCountry),
    )
    return HttpResponse.json({
      syncDate: activeTimesheetSyncDate,
      customerCountries: [...new Set(kpiCandidates(pl3Code).map((item) => item.customerCountry))],
      items,
    })
  }),

  http.get('*/api/v1/supervisor/toolkits', async () => {
    await delay(80)
    return HttpResponse.json(supervisorToolkits.filter((item) => !item.deletedAt))
  }),

  http.get('*/api/v1/supervisor/toolkits/:id', ({ params }) => {
    const toolkit = supervisorToolkits.find((item) => item.id === params.id && !item.deletedAt)
    return toolkit ? HttpResponse.json(toolkit) : problem(404, 'Toolkit not found.')
  }),

  http.post('*/api/v1/supervisor/toolkits', async ({ request }) => {
    const input = (await request.json()) as ToolkitEditorPayload
    if (!input.name.trim() || !input.pl3Code || !input.subtasks.some((item) => !item.deletedAt)) {
      return problem(422, 'Name, hierarchy and at least one active subtask are required.')
    }
    if (
      supervisorToolkits.some(
        (item) =>
          item.supervisorPositionId === supervisorPositionId && item.pl3Code === input.pl3Code,
      )
    ) {
      return problem(409, 'This Supervisor position and PL3 already has a Toolkit.')
    }
    const toolkit: SupervisorToolkit = {
      ...input,
      subtasks: input.subtasks.map((item) => ({ ...item })),
      sharedKpiSelections: input.sharedKpiSelections.map((item) => ({ ...item })),
      id: crypto.randomUUID(),
      version: 0,
      deletedAt: null,
    }
    supervisorToolkits.unshift(toolkit)
    return HttpResponse.json(toolkit, { status: 201 })
  }),

  http.put('*/api/v1/supervisor/toolkits/:id', async ({ params, request }) => {
    const input = (await request.json()) as ToolkitEditorPayload
    const index = supervisorToolkits.findIndex((item) => item.id === params.id && !item.deletedAt)
    const current = supervisorToolkits[index]
    if (!current) return problem(404, 'Toolkit not found.')
    if (input.version !== current.version) {
      return problem(409, 'Toolkit changed since it was opened. Refresh before saving.')
    }
    if (input.sharedKpiSelections.some((item) => 'deliveryHc' in item)) {
      return problem(422, 'Delivery HC must not be persisted in Toolkit selections.')
    }
    const updated: SupervisorToolkit = {
      ...current,
      ...input,
      subtasks: input.subtasks.map((item) => ({ ...item })),
      sharedKpiSelections: input.sharedKpiSelections.map((item) => ({ ...item })),
      version: current.version + 1,
    }
    supervisorToolkits[index] = updated
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/v1/supervisor/toolkits/:id', ({ params }) => {
    const toolkit = supervisorToolkits.find((item) => item.id === params.id && !item.deletedAt)
    if (!toolkit) return problem(404, 'Toolkit not found.')
    if (exercises.some((item) => item.toolkitId === toolkit.id)) {
      return problem(409, 'Referenced Toolkits cannot be deleted.')
    }
    toolkit.deletedAt = new Date().toISOString()
    toolkit.version += 1
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/v1/supervisor/exercises', () => {
    exercises.forEach(syncFlags)
    return HttpResponse.json(exercises)
  }),

  http.post('*/api/v1/supervisor/exercises', async ({ request }) => {
    const input = (await request.json()) as CreateExerciseInput
    const toolkit = supervisorToolkits.find(
      (item) => item.id === input.toolkitId && !item.deletedAt,
    )
    if (!toolkit) return problem(404, 'Toolkit not found.')
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.sizingMonth) ||
      input.slotWeeks < 1 ||
      input.tmsTo < input.tmsFrom
    ) {
      return problem(422, 'Exercise dates are invalid.')
    }
    const frozen = snapshot(toolkit)
    if (!frozen.subtasks.length || frozen.sharedKpis.some((item) => !item.valid)) {
      return problem(422, 'Toolkit snapshot is not valid for Exercise creation.')
    }
    const exercise: Exercise = {
      ...input,
      id: crypto.randomUUID(),
      exerciseCode: `EX-${new Date().getFullYear()}-${String(exercises.length + 1).padStart(4, '0')}`,
      workflowStatus: 'IN_PROGRESS',
      officialScenarioId: null,
      submittedAt: null,
      canDelete: true,
      canSubmit: false,
      canEdit: true,
      version: 0,
      createdAt: new Date().toISOString(),
      snapshot: frozen,
    }
    exercises.unshift(exercise)
    ensureShell(exercise)
    return HttpResponse.json(exercise, { status: 201 })
  }),

  http.get('*/api/v1/supervisor/exercises/:id', ({ params }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    return HttpResponse.json(exercise)
  }),

  http.delete('*/api/v1/supervisor/exercises/:id', ({ params }) => {
    const index = exercises.findIndex((item) => item.id === params.id)
    const exercise = exercises[index]
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    if (!exercise.canDelete) return problem(409, 'Exercise cannot be deleted.')
    exercises.splice(index, 1)
    exerciseShells.delete(exercise.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/v1/supervisor/exercises/:id/team-setup', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.teamSetup)
  }),

  http.put('*/api/v1/supervisor/exercises/:id/team-setup', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as TeamSetupRequest
    ctx.shell.teamSetup = recomputeTeamSetup({ ...ctx.shell.teamSetup, ...body })
    return HttpResponse.json(ctx.shell.teamSetup)
  }),

  http.get('*/api/v1/supervisor/exercises/:id/shifts', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.shifts)
  }),

  http.put('*/api/v1/supervisor/exercises/:id/shifts', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as ShiftRequest[]
    ctx.shell.shifts = body.map((item) => ({
      id: crypto.randomUUID(),
      shiftNo: item.shiftNo,
      startTime: item.startTime,
      durationMinutes: item.durationMinutes,
      headcount: item.headcount,
      worksOnWeekend: item.worksOnWeekend,
    }))
    return HttpResponse.json(ctx.shell.shifts)
  }),

  http.get('*/api/v1/supervisor/exercises/:id/production-support', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.support)
  }),

  http.post('*/api/v1/supervisor/exercises/:id/production-support', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as SupportItemRequest
    const hours =
      (Number(body.volume) * Number(body.workloadPerUnitMinutes) * Number(body.annualMultiplier)) /
      60
    const item = {
      id: crypto.randomUUID(),
      lineageId: crypto.randomUUID(),
      category: body.category,
      activity: body.activity,
      frequencyCode: body.frequencyCode,
      volume: body.volume,
      unitOfMeasure: body.unitOfMeasure,
      workloadPerUnitMinutes: body.workloadPerUnitMinutes,
      annualMultiplier: body.annualMultiplier,
      workloadPerYearHours: hours,
      supportFte: hours / 1800,
      comments: body.comments ?? null,
      calculationVersion: 'v1',
      scopes: (body.kpiLineIds?.length
        ? body.kpiLineIds
        : ctx.exercise.snapshot.sharedKpis.map((kpi) => kpi.id)
      ).map((kpiId, _, all) => ({
        exerciseSharedKpiLineId: kpiId,
        allocationRatio: 1 / Math.max(all.length, 1),
      })),
    }
    ctx.shell.support.push(item)
    return HttpResponse.json(item, { status: 201 })
  }),

  http.put(
    '*/api/v1/supervisor/exercises/:id/production-support/:itemId',
    async ({ params, request }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const index = ctx.shell.support.findIndex((item) => item.id === params.itemId)
      const current = ctx.shell.support[index]
      if (!current) return problem(404, 'The support item was not found.')
      const body = (await request.json()) as SupportItemRequest
      const hours =
        (Number(body.volume) * Number(body.workloadPerUnitMinutes) * Number(body.annualMultiplier)) /
        60
      const updated = {
        ...current,
        category: body.category,
        activity: body.activity,
        frequencyCode: body.frequencyCode,
        volume: body.volume,
        unitOfMeasure: body.unitOfMeasure,
        workloadPerUnitMinutes: body.workloadPerUnitMinutes,
        annualMultiplier: body.annualMultiplier,
        comments: body.comments ?? null,
        workloadPerYearHours: hours,
        supportFte: hours / 1800,
        scopes: (body.kpiLineIds?.length
          ? body.kpiLineIds
          : ctx.exercise.snapshot.sharedKpis.map((kpi) => kpi.id)
        ).map((kpiId, _, all) => ({
          exerciseSharedKpiLineId: kpiId,
          allocationRatio: 1 / Math.max(all.length, 1),
        })),
      }
      ctx.shell.support[index] = updated
      return HttpResponse.json(updated)
    },
  ),

  http.delete('*/api/v1/supervisor/exercises/:id/production-support/:itemId', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const index = ctx.shell.support.findIndex((item) => item.id === params.itemId)
    if (index < 0) return problem(404, 'The support item was not found.')
    ctx.shell.support.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/v1/supervisor/exercises/:id/calendar', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.calendar)
  }),

  http.put('*/api/v1/supervisor/exercises/:id/calendar', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as CalendarRequest
    ctx.shell.calendar = {
      countryCode: body.countryCode ?? null,
      timezone: body.timezone ?? null,
      weekendCode: body.weekendCode ?? null,
      baselineSource: body.baselineSource ?? null,
      baselineVersion: body.baselineVersion ?? null,
      version: ctx.shell.calendar.version + 1,
      holidays: (body.holidays ?? []).map((holiday) => ({
        id: crypto.randomUUID(),
        holidayDate: holiday.holidayDate,
        holidayName: holiday.holidayName,
        holidayType: holiday.holidayType,
        workingDayOverride: holiday.workingDayOverride ?? null,
      })),
    }
    return HttpResponse.json(ctx.shell.calendar)
  }),

  http.get('*/api/v1/supervisor/exercises/:id/volumes/monthly', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.monthlyVolumes)
  }),

  http.put('*/api/v1/supervisor/exercises/:id/volumes/monthly', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as MonthlyVolumeRequest[]
    ctx.shell.monthlyVolumes = body.map((row) => ({
      id: crypto.randomUUID(),
      month: row.month,
      actualVolume: row.actualVolume ?? null,
      commercialRatio: row.commercialRatio ?? null,
      manualForecastVolume: row.manualForecastVolume ?? null,
      sourceType: 'MANUAL',
    }))
    return HttpResponse.json(ctx.shell.monthlyVolumes)
  }),

  http.get('*/api/v1/supervisor/exercises/:id/volumes/daily', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.dailyVolumes)
  }),

  http.put('*/api/v1/supervisor/exercises/:id/volumes/daily', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as DailyVolumeRequest[]
    ctx.shell.dailyVolumes = body.map((row) => ({
      id: crypto.randomUUID(),
      volumeDate: row.volumeDate,
      actualVolume: row.actualVolume ?? null,
      dailyAdjustmentRatio: row.dailyAdjustmentRatio ?? null,
      manualForecastVolume: row.manualForecastVolume ?? null,
      sourceType: 'MANUAL',
    }))
    return HttpResponse.json(ctx.shell.dailyVolumes)
  }),

  http.get('*/api/v1/supervisor/exercises/:id/volumes/slot', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.slotVolumes)
  }),

  http.put('*/api/v1/supervisor/exercises/:id/volumes/slot', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as SlotVolumeRequest[]
    for (const row of body) {
      if (!(row.slotEndAt > row.slotStartAt)) {
        return problem(422, 'slotEndAt must be after slotStartAt.')
      }
    }
    ctx.shell.slotVolumes = body.map((row) => ({
      id: crypto.randomUUID(),
      slotStartAt: row.slotStartAt,
      slotEndAt: row.slotEndAt,
      rawVolume: row.rawVolume,
      timezone: row.timezone,
      sourceType: 'MANUAL',
    }))
    return HttpResponse.json(ctx.shell.slotVolumes)
  }),

  http.get('*/api/v1/supervisor/exercises/:id/cycle-time/active', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!ctx.shell.cycleTime) return problem(404, 'No active Cycle Time baseline.')
    return HttpResponse.json(ctx.shell.cycleTime)
  }),

  http.post('*/api/v1/supervisor/exercises/:id/cycle-time/manual', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as ManualBaselineRequest
    if (!body.medianSeconds || !body.manualReason?.trim()) {
      return problem(422, 'medianSeconds and manualReason are required.')
    }
    ctx.shell.cycleTime = {
      id: crypto.randomUUID(),
      baselineType: 'MANUAL',
      medianSeconds: body.medianSeconds,
      sampleCount: null,
      coverageRatio: null,
      calculationMethod: 'MANUAL',
      methodVersion: 'v1',
      manualReason: body.manualReason,
      active: true,
      calculatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(ctx.shell.cycleTime, { status: 201 })
  }),

  http.get('*/api/v1/supervisor/exercises/:id/scenarios', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.scenarios)
  }),

  http.post('*/api/v1/supervisor/exercises/:id/scenarios', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as CreateScenarioRequest
    if (!body.scenarioCode?.trim() || !body.name?.trim()) {
      return problem(422, 'scenarioCode and name are required.')
    }
    const scenario = {
      id: crypto.randomUUID(),
      scenarioCode: body.scenarioCode,
      name: body.name,
      description: body.description ?? null,
      status: 'DRAFT',
      officialAt: null,
      version: 0,
      assumptions: (body.assumptions ?? []).map((item) => ({
        id: crypto.randomUUID(),
        parameterCode: item.parameterCode,
        numericValue: item.numericValue ?? null,
        textValue: item.textValue ?? null,
        booleanValue: item.booleanValue ?? null,
        unit: item.unit ?? null,
      })),
    }
    ctx.shell.scenarios.push(scenario)
    return HttpResponse.json(scenario, { status: 201 })
  }),

  http.get('*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    const scenario = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
    return scenario ? HttpResponse.json(scenario) : problem(404, 'The Scenario was not found.')
  }),

  http.put(
    '*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId',
    async ({ params, request }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const index = ctx.shell.scenarios.findIndex((item) => item.id === params.scenarioId)
      const current = ctx.shell.scenarios[index]
      if (!current) return problem(404, 'The Scenario was not found.')
      if (current.status !== 'DRAFT') return problem(409, 'Only DRAFT scenarios can be modified.')
      const body = (await request.json()) as UpdateScenarioRequest
      const updated = {
        ...current,
        name: body.name,
        description: body.description ?? null,
        version: current.version + 1,
        assumptions:
          body.assumptions === undefined
            ? current.assumptions
            : body.assumptions.map((item) => ({
                id: crypto.randomUUID(),
                parameterCode: item.parameterCode,
                numericValue: item.numericValue ?? null,
                textValue: item.textValue ?? null,
                booleanValue: item.booleanValue ?? null,
                unit: item.unit ?? null,
              })),
      }
      ctx.shell.scenarios[index] = updated
      return HttpResponse.json(updated)
    },
  ),

  http.delete('*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const index = ctx.shell.scenarios.findIndex((item) => item.id === params.scenarioId)
    const current = ctx.shell.scenarios[index]
    if (!current) return problem(404, 'The Scenario was not found.')
    if (current.status !== 'DRAFT') return problem(409, 'Only DRAFT scenarios can be modified.')
    ctx.shell.scenarios.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId/official', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const target = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
    if (!target) return problem(404, 'The Scenario was not found.')
    if (target.status !== 'DRAFT') return problem(409, 'Only DRAFT scenarios can be marked Official.')
    if (!ctx.shell.cycleTime?.active) {
      return problem(422, 'An active Cycle Time baseline is required before Official.')
    }
    const hasForecast = ctx.shell.stubRuns.some(
      (run) =>
        run.scenarioId === target.id &&
        run.runType === 'FORECAST' &&
        run.status === 'ACCEPTED',
    )
    const hasMonthly = ctx.shell.stubRuns.some(
      (run) =>
        run.scenarioId === target.id &&
        run.runType === 'MONTHLY_SIZING' &&
        run.status === 'ACCEPTED',
    )
    const hasSlot = ctx.shell.stubRuns.some(
      (run) =>
        run.scenarioId === target.id && run.runType === 'SLOT' && run.status === 'ACCEPTED',
    )
    if (!hasForecast) {
      return problem(422, 'An ACCEPTED forecast run is required before Official.')
    }
    if (!hasMonthly) {
      return problem(422, 'An ACCEPTED monthly sizing run is required before Official.')
    }
    if (!hasSlot) {
      return problem(422, 'An ACCEPTED slot simulation run is required before Official.')
    }
    for (const scenario of ctx.shell.scenarios) {
      if (scenario.status === 'OFFICIAL') {
        scenario.status = 'DRAFT'
        scenario.officialAt = null
      }
    }
    target.status = 'OFFICIAL'
    target.officialAt = new Date().toISOString()
    target.version += 1
    ctx.shell.officialPackageId = crypto.randomUUID()
    ctx.shell.packageVersion += 1
    syncFlags(ctx.exercise)
    return HttpResponse.json(target)
  }),

  http.post(
    /\/api\/v1\/supervisor\/exercises\/[^/]+\/scenarios\/[^/]+\/forecast:run$/,
    ({ request }) => {
      const parts = new URL(request.url).pathname.split('/')
      const exerciseId = parts[parts.indexOf('exercises') + 1] ?? ''
      const scenarioId = parts[parts.indexOf('scenarios') + 1] ?? ''
      const ctx = requireExercise(exerciseId)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const scenario = ctx.shell.scenarios.find((item) => item.id === scenarioId)
      if (!scenario) return problem(404, 'The Scenario was not found.')
      if (scenario.status !== 'DRAFT') {
        return problem(409, 'Simulations can only run against DRAFT scenarios.')
      }
      const runNo =
        ctx.shell.stubRuns.filter(
          (item) => item.scenarioId === scenario.id && item.runType === 'FORECAST',
        ).length + 1
      const run = {
        id: crypto.randomUUID(),
        scenarioId: scenario.id,
        runType: 'FORECAST',
        status: 'ACCEPTED',
        runNo,
      }
      ctx.shell.stubRuns.push(run)
      const { scenarioId: _sid, ...view } = run
      return HttpResponse.json(view, { status: 201 })
    },
  ),

  http.post(
    '*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId/simulations/monthly',
    ({ params }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const scenario = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
      if (!scenario) return problem(404, 'The Scenario was not found.')
      if (scenario.status !== 'DRAFT') {
        return problem(409, 'Simulations can only run against DRAFT scenarios.')
      }
      if (
        !ctx.shell.stubRuns.some(
          (run) =>
            run.scenarioId === scenario.id &&
            run.runType === 'FORECAST' &&
            run.status === 'ACCEPTED',
        )
      ) {
        return problem(422, 'Run an ACCEPTED forecast before monthly sizing.')
      }
      const runNo =
        ctx.shell.stubRuns.filter(
          (item) => item.scenarioId === scenario.id && item.runType === 'MONTHLY_SIZING',
        ).length + 1
      const run = {
        id: crypto.randomUUID(),
        scenarioId: scenario.id,
        runType: 'MONTHLY_SIZING',
        status: 'ACCEPTED',
        runNo,
      }
      ctx.shell.stubRuns.push(run)
      const { scenarioId: _sid, ...view } = run
      return HttpResponse.json(view, { status: 201 })
    },
  ),

  http.post(
    '*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId/simulations/slot',
    ({ params }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const scenario = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
      if (!scenario) return problem(404, 'The Scenario was not found.')
      if (scenario.status !== 'DRAFT') {
        return problem(409, 'Simulations can only run against DRAFT scenarios.')
      }
      const runNo =
        ctx.shell.stubRuns.filter(
          (item) => item.scenarioId === scenario.id && item.runType === 'SLOT',
        ).length + 1
      const run = {
        id: crypto.randomUUID(),
        scenarioId: scenario.id,
        runType: 'SLOT',
        status: 'ACCEPTED',
        runNo,
      }
      ctx.shell.stubRuns.push(run)
      const { scenarioId: _sid, ...view } = run
      return HttpResponse.json(view, { status: 201 })
    },
  ),

  http.post('*/api/v1/supervisor/exercises/:id/validations/submit-preview', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    syncFlags(ctx.exercise)
    if (!ctx.exercise.canSubmit) {
      return problem(409, 'Exercise must have an Official Scenario and be editable to submit.')
    }
    const hasKpis = ctx.exercise.snapshot.sharedKpis.length > 0
    return HttpResponse.json({
      officialPackageId: ctx.shell.officialPackageId,
      findings: [
        {
          ruleCode: 'DAILY_VS_MONTHLY',
          severity: 'WARNING',
          passed: true,
          remarks: null,
        },
        {
          ruleCode: 'SHARED_KPI_PRESENT',
          severity: hasKpis ? 'INFO' : 'SEVERE',
          passed: hasKpis,
          remarks: null,
        },
      ],
      remarksRequired: !hasKpis,
    })
  }),

  http.post('*/api/v1/supervisor/exercises/:id/submit', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    syncFlags(ctx.exercise)
    if (!ctx.exercise.canSubmit) {
      return problem(409, 'Exercise must have an Official Scenario and be editable to submit.')
    }
    if (ctx.shell.submitted) return HttpResponse.json(ctx.shell.submitted, { status: 201 })
    const body = ((await request.json().catch(() => ({}))) ?? {}) as SubmitRequest
    const hasKpis = ctx.exercise.snapshot.sharedKpis.length > 0
    if (!hasKpis && !body.remarks?.trim()) {
      return problem(422, 'SEVERE validation failures require remarks before Submit.')
    }
    const official = ctx.shell.scenarios.find((item) => item.status === 'OFFICIAL')
    const now = new Date().toISOString()
    const packageId = ctx.shell.officialPackageId ?? crypto.randomUUID()
    ctx.shell.officialPackageId = packageId
    ctx.shell.packageVersion = ctx.shell.packageVersion || 1
    const details = {
      exerciseId: ctx.exercise.id,
      exerciseCode: ctx.exercise.exerciseCode,
      workflowStatus: 'UNDER_REVIEW',
      submittedAt: now,
      officialPackageId: packageId,
      packageVersion: ctx.shell.packageVersion,
      packageStatus: 'LOCKED',
      scenarioId: official?.id ?? '',
      scenarioName: official?.name ?? null,
      submissionId: crypto.randomUUID(),
      submissionCode: `SUB-${ctx.exercise.exerciseCode}`,
      submissionStatus: 'AWAITING_MANAGER',
      currentStep: 1,
      remarks: body.remarks ?? null,
      scopes: ctx.exercise.snapshot.sharedKpis.map((kpi) => ({
        scopeLevel: 'PL3',
        center: ctx.exercise.snapshot.toolkit.center,
        site: kpi.site,
        domain: ctx.exercise.snapshot.toolkit.domain,
        pl3Code: ctx.exercise.snapshot.toolkit.pl3Code,
        carrier: kpi.carrier,
        customerCountry: kpi.customerCountry,
      })),
      workflowInstanceId: crypto.randomUUID(),
      workflowStatusLabel: 'ACTIVE',
      steps: [
        {
          stepNo: 1,
          requiredRoleCode: 'MANAGER',
          assigneeUserId: crypto.randomUUID(),
          routingStatus: 'READY',
        },
      ],
      actions: [
        {
          stepNo: 0,
          actionType: 'SUBMIT',
          actorUserId: crypto.randomUUID(),
          actorRoleCode: 'SUPERVISOR',
          comments: body.remarks ?? null,
          actionAt: now,
          requestId: body.requestId ?? request.headers.get('Idempotency-Key') ?? crypto.randomUUID(),
        },
      ],
    }
    ctx.shell.submitted = details
    ctx.exercise.workflowStatus = 'UNDER_REVIEW'
    ctx.exercise.submittedAt = now
    syncFlags(ctx.exercise)
    return HttpResponse.json(details, { status: 201 })
  }),

  http.get('*/api/v1/supervisor/exercises/:id/submitted-details', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!ctx.shell.submitted) return problem(404, 'No submission exists for this Exercise.')
    return HttpResponse.json(ctx.shell.submitted)
  }),

  http.post('*/api/v1/supervisor/exercises/:id/withdraw', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (ctx.exercise.workflowStatus !== 'UNDER_REVIEW' || !ctx.shell.submitted) {
      return problem(409, 'Only UNDER_REVIEW Exercises can be withdrawn.')
    }
    if (!OPEN_LIKE_STATUSES.has(ctx.shell.submitted.submissionStatus)) {
      return problem(409, 'Workflow is not ACTIVE and cannot be withdrawn.')
    }
    const now = new Date().toISOString()
    const step = ctx.shell.submitted.steps.find((item) => item.routingStatus === 'READY')
    if (step) step.routingStatus = 'ACTED'
    ctx.shell.submitted.actions.push({
      stepNo: step?.stepNo ?? ctx.shell.submitted.currentStep ?? 1,
      actionType: 'WITHDRAW',
      actorUserId: crypto.randomUUID(),
      actorRoleCode: 'SUPERVISOR',
      comments: null,
      actionAt: now,
      requestId: crypto.randomUUID(),
    })
    ctx.shell.submitted.submissionStatus = 'ARCHIVED'
    ctx.shell.submitted.workflowStatusLabel = 'CANCELLED'
    ctx.shell.submitted.packageStatus = 'RETURNED'
    ctx.shell.submitted.workflowStatus = 'IN_PROGRESS'
    ctx.exercise.workflowStatus = 'IN_PROGRESS'
    ctx.exercise.officialScenarioId = null
    syncFlags(ctx.exercise)
    return HttpResponse.json(ctx.shell.submitted)
  }),
]
