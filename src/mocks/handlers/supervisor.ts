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
import { computeNetworkDays } from '@/features/holiday-templates/workingDays'
import type {
  SharedKpiCandidate,
  SharedKpiKey,
  SupervisorToolkit,
  ToolkitEditorPayload,
} from '@/features/toolkit-management/types'

import {
  annualMultiplier,
  fteAnnualHours,
  hoursPerYear,
  supportFte,
} from '@/features/exercise-management/components/associated-data/supportOptions'

import { ensureShell, exerciseShells, recomputeTeamSetup, seedTrainVolumes } from '../data/exercise-store'
import { holidayTemplateStore } from '../data/holiday-templates'
import {
  activeTimesheetSyncDate,
  exercises,
  hierarchy,
  kpiCandidates,
  supervisorPositionId,
  supervisorToolkits,
} from '../data/supervisor'

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
    return HttpResponse.json(
      {
        exercise,
        notices: [
          'Associated Data initialized from archived exercise (mock).',
          'Volume seeded from archived exercise for overlapping training periods.',
          'Volume Input rows generated for training windows (monthly / daily / per-slot).',
          'Working Days / Year computed for sizing year.',
        ],
      },
      { status: 201 },
    )
  }),

  http.get('*/api/v1/supervisor/exercises/:id', ({ params }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    return HttpResponse.json(exercise)
  }),

  http.put('*/api/v1/supervisor/exercises/:id/periods', async ({ params, request }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    if (!exercise.canEdit) return problem(422, 'Exercise periods can only be changed while In Progress or Returned.')
    const body = (await request.json()) as Pick<
      CreateExerciseInput,
      'sizingMonth' | 'slotStartDate' | 'slotWeeks' | 'tmsFrom' | 'tmsTo'
    >
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.sizingMonth) ||
      body.slotWeeks < 1 ||
      body.slotWeeks > 12 ||
      body.tmsTo < body.tmsFrom
    ) {
      return problem(422, 'Exercise dates are invalid.')
    }
    const previousYear = exercise.sizingMonth.slice(0, 4)
    const nextYear = body.sizingMonth.slice(0, 4)
    Object.assign(exercise, {
      sizingMonth: body.sizingMonth,
      slotStartDate: body.slotStartDate,
      slotWeeks: body.slotWeeks,
      tmsFrom: body.tmsFrom,
      tmsTo: body.tmsTo,
      version: exercise.version + 1,
    })
    const notices: string[] = []
    if (previousYear !== nextYear) {
      notices.push(
        `Sizing year changed (${previousYear} → ${nextYear}). Holiday templates were re-applied.`,
      )
      notices.push(`Working Days / Year computed for ${nextYear}.`)
    }
    seedTrainVolumes(exercise, ensureShell(exercise))
    notices.push('Volume Input grids refreshed for the updated training windows.')
    return HttpResponse.json({ exercise, notices })
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
    ctx.shell.teamSetup = recomputeTeamSetup(
      { ...ctx.shell.teamSetup, ...body },
      ctx.shell.cycleTime?.medianSeconds,
    )
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
    const setup = ctx.shell.teamSetup
    const multiplier = annualMultiplier(body.frequencyCode, setup.workingDaysPerYear)
    const hours = hoursPerYear(
      Number(body.volume),
      Number(body.workloadPerUnitMinutes),
      multiplier,
    )
    const fte = supportFte(hours, fteAnnualHours(setup))
    const item = {
      id: crypto.randomUUID(),
      lineageId: crypto.randomUUID(),
      category: body.category,
      activity: body.activity,
      frequencyCode: body.frequencyCode,
      volume: body.volume,
      unitOfMeasure: body.unitOfMeasure,
      workloadPerUnitMinutes: body.workloadPerUnitMinutes,
      annualMultiplier: multiplier,
      workloadPerYearHours: hours,
      supportFte: fte,
      comments: body.comments ?? null,
      calculationVersion: 'v1.2',
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
      const setup = ctx.shell.teamSetup
      const multiplier = annualMultiplier(body.frequencyCode, setup.workingDaysPerYear)
      const hours = hoursPerYear(
        Number(body.volume),
        Number(body.workloadPerUnitMinutes),
        multiplier,
      )
      const fte = supportFte(hours, fteAnnualHours(setup))
      const updated = {
        ...current,
        category: body.category,
        activity: body.activity,
        frequencyCode: body.frequencyCode,
        volume: body.volume,
        unitOfMeasure: body.unitOfMeasure,
        workloadPerUnitMinutes: body.workloadPerUnitMinutes,
        annualMultiplier: multiplier,
        comments: body.comments ?? null,
        workloadPerYearHours: hours,
        supportFte: fte,
        calculationVersion: 'v1.2',
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
    const holidays = (body.holidays ?? []).map((holiday) => ({
      id: crypto.randomUUID(),
      holidayDate: holiday.holidayDate,
      holidayName: holiday.holidayName,
      holidayType: holiday.holidayType,
      workingDayOverride: holiday.workingDayOverride ?? null,
    }))
    const year = ctx.shell.calendar.baselineYear ?? Number(ctx.exercise.sizingMonth.slice(0, 4))
    const weekend = body.weekendCode ?? ctx.shell.calendar.weekendCode ?? 'SAT_SUN'
    ctx.shell.calendar = {
      ...ctx.shell.calendar,
      weekendCode: weekend,
      baselineSource: body.baselineSource ?? ctx.shell.calendar.baselineSource,
      baselineVersion: body.baselineVersion ?? ctx.shell.calendar.baselineVersion,
      workingDaysPerYear: computeNetworkDays(
        year,
        weekend,
        holidays.map((h) => h.holidayDate),
      ),
      version: ctx.shell.calendar.version + 1,
      holidays,
    }
    return HttpResponse.json(ctx.shell.calendar)
  }),

  http.post('*/api/v1/supervisor/exercises/:id/calendar/reapply-template', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const center = ctx.exercise.snapshot.toolkit.center
    const year = Number(ctx.exercise.sizingMonth.slice(0, 4))
    const allTemplates = holidayTemplateStore
      .list()
      .map((s) => holidayTemplateStore.get(s.id)!)
      .filter(Boolean)
    const published =
      allTemplates.find((t) => t.center === center && t.year === year && t.status === 'PUBLISHED') ??
      allTemplates.find((t) => t.center === center && t.year === year && t.version > 0)
    const notices: string[] = []
    if (!published) {
      notices.push(
        `No published holiday template for Center ${center} / ${year}. Create and Publish a template for that year, then Re-apply.`,
      )
    }
    const customs = ctx.shell.calendar.holidays.filter(
      (h) => h.holidayType?.toUpperCase() === 'CUSTOM',
    )
    const baseline = (published?.holidays ?? []).map((h) => ({
      id: crypto.randomUUID(),
      holidayDate: h.holidayDate,
      holidayName: h.holidayName,
      holidayType: 'BASELINE',
      workingDayOverride: null as boolean | null,
    }))
    const holidays = [...baseline, ...customs]
    const weekend = published?.defaultWeekendCode ?? ctx.shell.calendar.weekendCode ?? 'SAT_SUN'
    ctx.shell.calendar = {
      ...ctx.shell.calendar,
      weekendCode: weekend,
      baselineSource: published ? 'CENTER_TEMPLATE' : 'NO_TEMPLATE',
      baselineVersion: published ? String(published.version) : null,
      sourceTemplateId: published?.id ?? null,
      sourceTemplateVersion: published?.version ?? null,
      baselineYear: year,
      workingDaysPerYear: computeNetworkDays(
        year,
        weekend,
        holidays.map((h) => h.holidayDate),
      ),
      version: ctx.shell.calendar.version + 1,
      templateUpdateAvailable: false,
      publishedTemplateVersion: null,
      templateUpdateMessage: null,
      holidays,
    }
    if (ctx.shell.teamSetup) {
      ctx.shell.teamSetup = {
        ...ctx.shell.teamSetup,
        weekendCode: weekend,
        workingDaysPerYear: ctx.shell.calendar.workingDaysPerYear ?? null,
        version: ctx.shell.teamSetup.version + 1,
      }
    }
    return HttpResponse.json({ calendar: ctx.shell.calendar, notices })
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

  http.get('*/api/v1/supervisor/exercises/:id/volumes/monthly/export-template', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-monthly-template.xlsx"',
      },
    }),
  ),
  http.get('*/api/v1/supervisor/exercises/:id/volumes/monthly/export', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-monthly.xlsx"',
      },
    }),
  ),
  http.post('*/api/v1/supervisor/exercises/:id/volumes/monthly/import', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    return HttpResponse.json(ctx.shell.monthlyVolumes)
  }),
  http.get('*/api/v1/supervisor/exercises/:id/volumes/daily/export-template', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-daily-template.xlsx"',
      },
    }),
  ),
  http.get('*/api/v1/supervisor/exercises/:id/volumes/daily/export', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-daily.xlsx"',
      },
    }),
  ),
  http.post('*/api/v1/supervisor/exercises/:id/volumes/daily/import', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    return HttpResponse.json(ctx.shell.dailyVolumes)
  }),
  http.get('*/api/v1/supervisor/exercises/:id/volumes/slot/export-template', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-slot-template.xlsx"',
      },
    }),
  ),
  http.get('*/api/v1/supervisor/exercises/:id/volumes/slot/export', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-slot.xlsx"',
      },
    }),
  ),
  http.post('*/api/v1/supervisor/exercises/:id/volumes/slot/import', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    return HttpResponse.json(ctx.shell.slotVolumes)
  }),

  http.get('*/api/v1/supervisor/exercises/:id/cycle-time/active', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!ctx.shell.cycleTime) return problem(404, 'No active Cycle Time baseline.')
    return HttpResponse.json({
      ...ctx.shell.cycleTime,
      files: ctx.shell.cycleTime.files ?? [],
    })
  }),

  http.post(
    '*/api/v1/supervisor/exercises/:id/cycle-time/support-files',
    async ({ params, request }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File) || file.size === 0) {
        return problem(422, 'A support file is required.')
      }
      const uploaded = {
        id: crypto.randomUUID(),
        fileName: file.name || 'support-file',
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        webUrl: `https://example.local/files/${crypto.randomUUID()}`,
        displayOrder: 0,
      }
      const pending = (ctx.shell as { pendingSupportFiles?: typeof uploaded[] }).pendingSupportFiles
      if (pending) {
        pending.push(uploaded)
      } else {
        ;(ctx.shell as { pendingSupportFiles?: typeof uploaded[] }).pendingSupportFiles = [
          uploaded,
        ]
      }
      return HttpResponse.json(uploaded, { status: 201 })
    },
  ),

  http.post('*/api/v1/supervisor/exercises/:id/cycle-time/manual', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as ManualBaselineRequest
    if (!body.medianSeconds || !body.manualReason?.trim()) {
      return problem(422, 'medianSeconds and manualReason are required.')
    }
    const pending =
      (ctx.shell as { pendingSupportFiles?: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number; webUrl: string; displayOrder: number }> })
        .pendingSupportFiles ?? []
    const previousFiles = ctx.shell.cycleTime?.files ?? []
    const known = [...pending, ...previousFiles]
    const files = (body.fileArtifactIds ?? []).map((id, index) => {
      const match = known.find((file) => file.id === id)
      if (!match) {
        return {
          id,
          fileName: `support-${index + 1}`,
          mimeType: 'application/octet-stream',
          sizeBytes: null,
          webUrl: `https://example.local/files/${id}`,
          displayOrder: index,
        }
      }
      return { ...match, displayOrder: index }
    })
    ctx.shell.cycleTime = {
      id: crypto.randomUUID(),
      baselineType: 'MANUAL',
      medianSeconds: body.medianSeconds,
      sampleCount: null,
      calculationMethod: 'MANUAL_ENTRY',
      manualReason: body.manualReason,
      active: true,
      calculatedAt: new Date().toISOString(),
      files,
    }
    ctx.shell.teamSetup = recomputeTeamSetup(ctx.shell.teamSetup, body.medianSeconds)
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
    let scenarioCode = body.scenarioCode.trim()
    if (ctx.shell.scenarios.some((item) => item.scenarioCode === scenarioCode)) {
      let max = 0
      for (const item of ctx.shell.scenarios) {
        const match = /^S(\d+)$/i.exec(item.scenarioCode?.trim() ?? '')
        if (match) max = Math.max(max, Number(match[1]))
      }
      scenarioCode = `S${max + 1}`
    }
    const name =
      body.name.includes(body.scenarioCode) && scenarioCode !== body.scenarioCode
        ? body.name.replace(body.scenarioCode, scenarioCode)
        : body.name
    const scenario = {
      id: crypto.randomUUID(),
      scenarioCode,
      name,
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

  http.put(
    '*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId/commit',
    async ({ params, request }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const index = ctx.shell.scenarios.findIndex((item) => item.id === params.scenarioId)
      const current = ctx.shell.scenarios[index]
      if (!current) return problem(404, 'The Scenario was not found.')
      if (current.status !== 'DRAFT') return problem(409, 'Only DRAFT scenarios can be saved.')
      const body = (await request.json()) as {
        name: string
        description?: string | null
        assumptions?: Array<{
          parameterCode: string
          numericValue?: number | null
          textValue?: string | null
          booleanValue?: boolean | null
          unit?: string | null
        }>
        shifts: Array<{
          shiftNo: number
          startTime: string
          durationMinutes: number
          headcount: number
          worksOnWeekend: boolean
        }>
        results?: {
          forecast: { monthly: unknown; daily: unknown }
          monthly: unknown
          daily: unknown
          slot?: unknown | null
        } | null
      }
      if (!body.shifts?.length) return problem(422, 'Shifts are required when saving a scenario.')
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
      ctx.shell.shifts = body.shifts.map((row) => ({
        id: crypto.randomUUID(),
        shiftNo: row.shiftNo,
        startTime: row.startTime.length === 5 ? `${row.startTime}:00` : row.startTime,
        durationMinutes: row.durationMinutes,
        headcount: row.headcount,
        worksOnWeekend: row.worksOnWeekend,
      }))

      const shell = ctx.shell as {
        latestForecastByScenario?: Record<string, Record<string, unknown>>
        latestMonthlySizingByScenario?: Record<string, unknown>
        latestDailySizingByScenario?: Record<string, unknown>
        latestSlotByScenario?: Record<string, unknown>
      }
      if (shell.latestForecastByScenario) delete shell.latestForecastByScenario[current.id]
      if (shell.latestMonthlySizingByScenario) delete shell.latestMonthlySizingByScenario[current.id]
      if (shell.latestDailySizingByScenario) delete shell.latestDailySizingByScenario[current.id]
      if (shell.latestSlotByScenario) delete shell.latestSlotByScenario[current.id]

      if (body.results) {
        shell.latestForecastByScenario = {
          ...(shell.latestForecastByScenario ?? {}),
          [current.id]: {
            MONTHLY: body.results.forecast.monthly as Record<string, unknown>,
            DAILY: body.results.forecast.daily as Record<string, unknown>,
          },
        }
        shell.latestMonthlySizingByScenario = {
          ...(shell.latestMonthlySizingByScenario ?? {}),
          [current.id]: body.results.monthly,
        }
        shell.latestDailySizingByScenario = {
          ...(shell.latestDailySizingByScenario ?? {}),
          [current.id]: body.results.daily,
        }
        if (body.results.slot) {
          shell.latestSlotByScenario = {
            ...(shell.latestSlotByScenario ?? {}),
            [current.id]: body.results.slot,
          }
        }
      }
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
      const sizing = ctx.exercise.sizingMonth || '2026-08'
      const [y, m] = sizing.split('-').map(Number)
      const nextYm = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }
      const nextMonth = `${nextYm.y}-${String(nextYm.m).padStart(2, '0')}`
      const daysInMonth = new Date(nextYm.y, nextYm.m, 0).getDate()
      const dailyPoints = Array.from({ length: daysInMonth }, (_, index) => {
        const day = String(index + 1).padStart(2, '0')
        const date = `${nextMonth}-${day}`
        return {
          id: crypto.randomUUID(),
          periodStart: date,
          periodEnd: date,
          forecastMean: 100,
          lowerBound: 90,
          upperBound: 110,
          acceptedValue: 100,
        }
      })
      const now = new Date().toISOString()
      return HttpResponse.json({
        monthly: {
          id: crypto.randomUUID(),
          runNo: 0,
          method: 'STUB',
          methodVersion: 'stub-v1',
          status: 'ACCEPTED',
          forecastLevel: 'MONTHLY',
          trainingFrom: `${sizing}-01`,
          trainingTo: `${sizing}-28`,
          featureMetadata: '{"stub":true,"level":"MONTHLY","preview":true}',
          startedAt: now,
          completedAt: now,
          points: [
            {
              id: crypto.randomUUID(),
              periodStart: `${nextMonth}-01`,
              periodEnd: `${nextMonth}-${String(daysInMonth).padStart(2, '0')}`,
              forecastMean: 1000,
              lowerBound: 900,
              upperBound: 1100,
              acceptedValue: 1000,
            },
          ],
        },
        daily: {
          id: crypto.randomUUID(),
          runNo: 0,
          method: 'STUB',
          methodVersion: 'stub-v1',
          status: 'ACCEPTED',
          forecastLevel: 'DAILY',
          trainingFrom: `${sizing}-01`,
          trainingTo: `${sizing}-28`,
          featureMetadata: '{"stub":true,"level":"DAILY","preview":true}',
          startedAt: now,
          completedAt: now,
          points: dailyPoints,
        },
      })
    },
  ),

  http.post(
    /\/api\/v1\/supervisor\/exercises\/[^/]+\/scenarios\/[^/]+\/sizing:preview$/,
    async ({ request }) => {
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
      const body = (await request.json()) as { rightSizingHc?: number }
      const rsHc = Number(body.rightSizingHc)
      if (!Number.isFinite(rsHc) || rsHc <= 0) {
        return problem(422, 'rightSizingHc must be a positive number.')
      }
      const sizing = ctx.exercise.sizingMonth || '2026-08'
      const [y, m] = sizing.split('-').map(Number)
      const nextYm = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }
      const nextMonth = `${nextYm.y}-${String(nextYm.m).padStart(2, '0')}`
      const daysInMonth = new Date(nextYm.y, nextYm.m, 0).getDate()
      const months = [1, 2, 3].map((delta) => {
        const mm = m + delta
        const yy = y + Math.floor((mm - 1) / 12)
        const month = ((mm - 1) % 12) + 1
        return `${yy}-${String(month).padStart(2, '0')}`
      })
      const now = new Date().toISOString()
      const monthlyForecastId = crypto.randomUUID()
      const dailyForecastId = crypto.randomUUID()
      const dailyPoints = Array.from({ length: daysInMonth }, (_, index) => {
        const day = String(index + 1).padStart(2, '0')
        const date = `${nextMonth}-${day}`
        return {
          id: crypto.randomUUID(),
          periodStart: date,
          periodEnd: date,
          forecastMean: 100,
          lowerBound: 90,
          upperBound: 110,
          acceptedValue: 100,
        }
      })
      let backlog = 0
      const dailyRows = Array.from({ length: daysInMonth }, (_, index) => {
        const day = String(index + 1).padStart(2, '0')
        const date = `${nextMonth}-${day}`
        const forecastVolume = 100
        const manualVolume = 95
        const standardCapacity = 110
        const overtimeCapacity = 10
        const backlogStart = backlog
        backlog = Math.max(0, backlogStart + manualVolume - standardCapacity - overtimeCapacity)
        return {
          id: crypto.randomUUID(),
          resultDate: date,
          forecastVolume,
          manualVolume,
          holiday: false,
          workingDay: true,
          simulationHc: rsHc,
          standardCapacity,
          overtimeCapacity,
          backlogStart,
          backlogEnd: backlog,
        }
      })
      return HttpResponse.json({
        forecast: {
          monthly: {
            id: monthlyForecastId,
            runNo: 0,
            method: 'STUB',
            methodVersion: 'stub-v1',
            status: 'ACCEPTED',
            forecastLevel: 'MONTHLY',
            trainingFrom: `${sizing}-01`,
            trainingTo: `${sizing}-28`,
            featureMetadata: '{"stub":true,"level":"MONTHLY","preview":true}',
            startedAt: now,
            completedAt: now,
            points: [
              {
                id: crypto.randomUUID(),
                periodStart: `${nextMonth}-01`,
                periodEnd: `${nextMonth}-${String(daysInMonth).padStart(2, '0')}`,
                forecastMean: 1000,
                lowerBound: 900,
                upperBound: 1100,
                acceptedValue: 1000,
              },
            ],
          },
          daily: {
            id: dailyForecastId,
            runNo: 0,
            method: 'STUB',
            methodVersion: 'stub-v1',
            status: 'ACCEPTED',
            forecastLevel: 'DAILY',
            trainingFrom: `${sizing}-01`,
            trainingTo: `${sizing}-28`,
            featureMetadata: '{"stub":true,"level":"DAILY","preview":true}',
            startedAt: now,
            completedAt: now,
            points: dailyPoints,
          },
        },
        monthly: {
          id: crypto.randomUUID(),
          runNo: 0,
          status: 'ACCEPTED',
          calculationVersion: 'sizing-v1',
          forecastRunId: monthlyForecastId,
          startedAt: now,
          completedAt: now,
          rows: months.map((month, index) => ({
            id: crypto.randomUUID(),
            month,
            forecastVolume: 1000 + index * 20,
            manualVolume: 950 + index * 20,
            workdays: 22,
            weekendDays: 8,
            cycleTimeSeconds: 120,
            nominalHcWithoutOt: 10,
            nominalHcWithOt: 9,
            productionSupportFte: 0.5,
            rightSizingHc: rsHc,
            capacityCreation: 1.2,
          })),
        },
        daily: {
          id: crypto.randomUUID(),
          runNo: 0,
          status: 'ACCEPTED',
          calculationVersion: 'sizing-v1',
          forecastRunId: dailyForecastId,
          startedAt: now,
          completedAt: now,
          rows: dailyRows,
        },
      })
    },
  ),

  http.get(
    '*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId/forecast/latest',
    ({ params, request }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      const scenario = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
      if (!scenario) return problem(404, 'The Scenario was not found.')
      const level = (new URL(request.url).searchParams.get('level') || 'MONTHLY').toUpperCase()
      const map = (ctx.shell as { latestForecastByScenario?: Record<string, Record<string, unknown>> })
        .latestForecastByScenario
      const byLevel = map?.[scenario.id]
      const forecast = byLevel?.[level] ?? (level === 'MONTHLY' ? byLevel?.MONTHLY : undefined)
      if (!forecast) {
        return problem(404, `No ACCEPTED ${level} forecast run exists for this scenario.`)
      }
      return HttpResponse.json(forecast)
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
      const sizing = ctx.exercise.sizingMonth || '2026-08'
      const [y, m] = sizing.split('-').map(Number)
      const months = [1, 2, 3].map((delta) => {
        const mm = m + delta
        const yy = y + Math.floor((mm - 1) / 12)
        const month = ((mm - 1) % 12) + 1
        return `${yy}-${String(month).padStart(2, '0')}`
      })
      const rsHc =
        scenario.assumptions.find((a) => a.parameterCode === 'RIGHT_SIZING_HC')?.numericValue ?? 8.6
      ;(ctx.shell as { latestMonthlySizingByScenario?: Record<string, unknown> })
        .latestMonthlySizingByScenario = {
        ...((ctx.shell as { latestMonthlySizingByScenario?: Record<string, unknown> })
          .latestMonthlySizingByScenario ?? {}),
        [scenario.id]: {
          id: run.id,
          runNo,
          status: 'ACCEPTED',
          calculationVersion: 'sizing-v1',
          forecastRunId: null,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          rows: months.map((month, index) => ({
            id: crypto.randomUUID(),
            month,
            forecastVolume: 1000 + index * 20,
            manualVolume: 950 + index * 20,
            workdays: 22,
            weekendDays: 8,
            cycleTimeSeconds: 120,
            nominalHcWithoutOt: 10,
            nominalHcWithOt: 9,
            productionSupportFte: 0.5,
            rightSizingHc: rsHc,
            capacityCreation: 1.2,
          })),
        },
      }
      ctx.shell.stubRuns.push(run)
      const monthlyView = (ctx.shell as { latestMonthlySizingByScenario?: Record<string, unknown> })
        .latestMonthlySizingByScenario?.[scenario.id]
      return HttpResponse.json(monthlyView ?? null, { status: 201 })
    },
  ),

  http.get(
    '*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId/simulations/monthly/latest',
    ({ params }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      const scenario = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
      if (!scenario) return problem(404, 'The Scenario was not found.')
      const map = (ctx.shell as { latestMonthlySizingByScenario?: Record<string, unknown> })
        .latestMonthlySizingByScenario
      const view = map?.[scenario.id]
      if (!view) return problem(404, 'No ACCEPTED monthly sizing run exists for this scenario.')
      return HttpResponse.json(view)
    },
  ),

  http.post(
    '*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId/simulations/daily',
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
            run.runType === 'FORECAST_DAILY' &&
            run.status === 'ACCEPTED',
        )
      ) {
        return problem(422, 'Run an ACCEPTED daily forecast before daily simulation.')
      }
      const runNo =
        ctx.shell.stubRuns.filter(
          (item) => item.scenarioId === scenario.id && item.runType === 'DAILY',
        ).length + 1
      const run = {
        id: crypto.randomUUID(),
        scenarioId: scenario.id,
        runType: 'DAILY',
        status: 'ACCEPTED',
        runNo,
      }
      ctx.shell.stubRuns.push(run)
      const sizing = ctx.exercise.sizingMonth || '2026-08'
      const [y, m] = sizing.split('-').map(Number)
      const nextYm = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }
      const nextMonth = `${nextYm.y}-${String(nextYm.m).padStart(2, '0')}`
      const daysInMonth = new Date(nextYm.y, nextYm.m, 0).getDate()
      let backlog = 0
      const rows = Array.from({ length: daysInMonth }, (_, index) => {
        const day = String(index + 1).padStart(2, '0')
        const date = `${nextMonth}-${day}`
        const forecastVolume = 100
        const manualVolume = 95
        const standardCapacity = 110
        const overtimeCapacity = 10
        const backlogStart = backlog
        backlog = Math.max(0, backlogStart + manualVolume - standardCapacity - overtimeCapacity)
        return {
          id: crypto.randomUUID(),
          resultDate: date,
          forecastVolume,
          manualVolume,
          holiday: false,
          workingDay: true,
          simulationHc: 8.6,
          standardCapacity,
          overtimeCapacity,
          backlogStart,
          backlogEnd: backlog,
        }
      })
      ;(ctx.shell as { latestDailySizingByScenario?: Record<string, unknown> })
        .latestDailySizingByScenario = {
        ...((ctx.shell as { latestDailySizingByScenario?: Record<string, unknown> })
          .latestDailySizingByScenario ?? {}),
        [scenario.id]: {
          id: run.id,
          runNo,
          status: 'ACCEPTED',
          calculationVersion: 'sizing-v1',
          forecastRunId: null,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          rows,
        },
      }
      const dailyView = (ctx.shell as { latestDailySizingByScenario?: Record<string, unknown> })
        .latestDailySizingByScenario?.[scenario.id]
      return HttpResponse.json(dailyView ?? null, { status: 201 })
    },
  ),

  http.get(
    '*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId/simulations/daily/latest',
    ({ params }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      const scenario = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
      if (!scenario) return problem(404, 'The Scenario was not found.')
      const map = (ctx.shell as { latestDailySizingByScenario?: Record<string, unknown> })
        .latestDailySizingByScenario
      const view = map?.[scenario.id]
      if (!view) return problem(404, 'No ACCEPTED daily simulation run exists for this scenario.')
      return HttpResponse.json(view)
    },
  ),

  http.post(
    '*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId/simulations/slot',
    async ({ params, request }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const scenario = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
      if (!scenario) return problem(404, 'The Scenario was not found.')
      if (scenario.status !== 'DRAFT') {
        return problem(409, 'Simulations can only run against DRAFT scenarios.')
      }
      const body = (await request.json()) as {
        shifts?: Array<{
          shiftNo: number
          startTime: string
          durationMinutes: number
          headcount: number
          worksOnWeekend: boolean
        }>
      }
      const shifts = body.shifts ?? []
      if (!shifts.length) {
        return problem(422, 'At least one shift is required before slot simulation.')
      }
      if (!ctx.shell.slotVolumes?.length) {
        return problem(422, 'Slot volume inputs are required before slot simulation.')
      }

      const volumes = [...ctx.shell.slotVolumes].sort((a, b) =>
        String(a.slotStartAt).localeCompare(String(b.slotStartAt)),
      )
      let backlog = 0
      let manualSum = 0
      let capacitySum = 0
      let outsideSum = 0
      const shiftKeys = shifts.map((s) => `shift${s.shiftNo}`)
      const shiftFteByKey: Record<string, number[]> = Object.fromEntries(
        shiftKeys.map((k) => [k, [] as number[]]),
      )
      const labels: string[] = []
      const theoreticalFte: number[] = []
      const cumulativeTat: number[] = []
      const rows = volumes.map((volume, index) => {
        const raw = Number(volume.rawVolume) || 0
        const manual = raw * 0.95
        const casesPerFte = 25
        const theoretical = casesPerFte > 0 ? manual / casesPerFte : 0
        const perShift = shifts.map((shift) => Number(shift.headcount) || 0)
        perShift.forEach((v, i) => shiftFteByKey[shiftKeys[i]!]?.push(v))
        const shiftFte = perShift.reduce((a, b) => a + b, 0)
        const teamCapacity = shiftFte * casesPerFte
        const outside = index > 10 && backlog > 0 ? Math.min(backlog * 0.1, manual * 0.05) : 0
        const backlogStart = backlog
        backlog = Math.max(0, backlogStart + manual - teamCapacity)
        manualSum += manual
        capacitySum += teamCapacity
        outsideSum += outside
        const tat = manualSum > 0 ? Math.max(0, 1 - outsideSum / manualSum) : 1
        labels.push(String(volume.slotStartAt))
        theoreticalFte.push(theoretical)
        cumulativeTat.push(tat)
        return {
          id: crypto.randomUUID(),
          slotStartAt: volume.slotStartAt,
          slotEndAt: volume.slotEndAt,
          rawVolume: raw,
          manualVolume: manual,
          theoreticalFte: theoretical,
          shiftFte,
          casesPerFte,
          teamCapacity,
          backlogStart,
          backlogEnd: backlog,
          volumeOutsideSla: outside,
          tatResult: tat,
          slaResult: tat,
        }
      })
      const tatOnPeriod = manualSum > 0 ? Math.max(0, 1 - outsideSum / manualSum) : 1
      const actualVsTheoretical = manualSum > 0 ? capacitySum / manualSum : 1
      const now = new Date().toISOString()
      const view = {
        id: crypto.randomUUID(),
        runNo: 0,
        status: 'ACCEPTED',
        calculationVersion: 'slot-v1',
        forecastRunId: null,
        startedAt: now,
        completedAt: now,
        tatOnPeriod,
        actualVsTheoretical,
        shiftCount: shifts.length,
        applicability: true,
        slaTargetRatio: ctx.shell.teamSetup?.slaTargetRatio ?? 0.9,
        rows,
        chart: { labels, theoreticalFte, shiftFteByKey, cumulativeTat },
      }
      return HttpResponse.json(view)
    },
  ),

  http.get(
    '*/api/v1/supervisor/exercises/:id/scenarios/:scenarioId/simulations/slot/latest',
    ({ params }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      const scenario = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
      if (!scenario) return problem(404, 'The Scenario was not found.')
      const view = (ctx.shell as { latestSlotByScenario?: Record<string, unknown> })
        .latestSlotByScenario?.[scenario.id]
      if (!view) return problem(404, 'No ACCEPTED slot simulation run exists for this scenario.')
      return HttpResponse.json(view)
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
