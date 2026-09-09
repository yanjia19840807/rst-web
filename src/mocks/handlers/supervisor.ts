import { delay, http, HttpResponse, passthrough } from 'msw'

import { buildApprovalWorkspace } from '../approvalWorkspace'

import type {
  CalendarRequest,
  CreateExerciseInput,
  CreateScenarioRequest,
  DailyVolume,
  DailyVolumeRequest,
  Exercise,
  ExerciseTmsSession,
  MonthlyVolume,
  ManualBaselineRequest,
  MonthlyVolumeRequest,
  SlotVolumeRequest,
  SubmitRequest,
  SupportItemRequest,
  TeamSetupRequest,
  ValidationSeverity,
} from '@/features/exercise-management/types'
import { VALIDATION_RULES } from '@/features/exercise-management/types'
import { attachSystemTmsRatio, computeTmsRatio, TMS_RATIO_REASONS } from '@/features/exercise-management/tmsRatio'
import type {
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

import { slotTrainKeys } from '@/features/exercise-management/periodWindows'
import {
  applyDemoTms,
  emptyTms,
  ensureShell,
  exerciseShells,
  replaceEmptySlotGrid,
  seedTrainVolumes,
  teamSetupView,
} from '../data/exercise-store'
import { supportCategoryStore } from '../data/support-category'
import {
  activeTimesheetSyncDate,
  exercises,
  hierarchy,
  kpiCandidates,
  supervisorPositionId,
  supervisorToolkits,
} from '../data/supervisor'
import { readSessions, writeSessions } from '../data/tms'
import { pageOf, pageParams } from '../page'

function volumeText(value: number): string {
  return String(Number(value.toPrecision(12)))
}

function dailyMonthlyVolumeCheck(
  monthly: MonthlyVolume[],
  daily: DailyVolume[],
): {
  severity: ValidationSeverity
  detail: {
    reason: string
    comparedMonths: number
    mismatches: { month: string; daily: string; monthly: string }[]
  }
} {
  const monthlyByMonth = new Map<string, number>()
  for (const row of monthly) {
    if (row.actualVolume == null || !row.month) continue
    monthlyByMonth.set(row.month, (monthlyByMonth.get(row.month) ?? 0) + Number(row.actualVolume))
  }
  const dailyByMonth = new Map<string, number>()
  for (const row of daily) {
    if (row.actualVolume == null || !row.volumeDate) continue
    const month = row.volumeDate.slice(0, 7)
    dailyByMonth.set(month, (dailyByMonth.get(month) ?? 0) + Number(row.actualVolume))
  }
  if (monthlyByMonth.size === 0 || dailyByMonth.size === 0) {
    const reason =
      monthlyByMonth.size === 0 && dailyByMonth.size === 0
        ? 'both-empty'
        : monthlyByMonth.size === 0
          ? 'monthly-empty'
          : 'daily-empty'
    return {
      severity: 'OK',
      detail: { reason, comparedMonths: 0, mismatches: [] },
    }
  }
  const mismatches: { month: string; daily: string; monthly: string }[] = []
  let compared = 0
  for (const [month, monthlyTotal] of monthlyByMonth) {
    const dailyTotal = dailyByMonth.get(month)
    if (dailyTotal == null) continue
    compared++
    if (dailyTotal !== monthlyTotal) {
      mismatches.push({
        month,
        daily: volumeText(dailyTotal),
        monthly: volumeText(monthlyTotal),
      })
    }
  }
  if (compared === 0) {
    return {
      severity: 'OK',
      detail: { reason: 'no-overlap', comparedMonths: 0, mismatches: [] },
    }
  }
  if (mismatches.length === 0) {
    return {
      severity: 'OK',
      detail: { reason: 'matched', comparedMonths: compared, mismatches: [] },
    }
  }
  return {
    severity: VALIDATION_RULES.DAILY_VS_MONTHLY.severity,
    detail: { reason: 'mismatch', comparedMonths: compared, mismatches },
  }
}

function tmsRatioFinding(
  exercise: Exercise,
  daily: DailyVolume[],
  sessions: ExerciseTmsSession[],
  baselineType: string | null | undefined,
) {
  if (baselineType?.toUpperCase() !== 'SYSTEM' || !exercise.tmsFrom || !exercise.tmsTo) {
    return null
  }
  const ratio = computeTmsRatio({
    tmsFrom: exercise.tmsFrom,
    tmsTo: exercise.tmsTo,
    daily,
    sessions,
  })
  if (!ratio) return null
  const warning =
    ratio.reason === TMS_RATIO_REASONS.incompleteCoverage ||
    ratio.reason === TMS_RATIO_REASONS.belowThreshold ||
    ratio.reason === TMS_RATIO_REASONS.dailyVolumeZero
  return {
    ruleCode: 'TMS_RATIO' as const,
    severity: warning ? VALIDATION_RULES.TMS_RATIO.severity : ('OK' as ValidationSeverity),
    detail: {
      reason: ratio.reason,
      comparedMonths: 0,
      mismatches: [],
      ratio: ratio.ratio,
      tmsVolumeSum: ratio.tmsVolumeSum,
      dailyVolumeSum: ratio.dailyVolumeSum,
      missingDateCount: ratio.missingDateCount,
      threshold: ratio.threshold,
    },
  }
}

function problem(status: number, detail: string) {
  return HttpResponse.json({ title: 'Supervisor request failed', status, detail }, { status })
}

function syncSessions(
  predicate: (session: { toolkitId: string; subtaskId: string | null }) => boolean,
  enabled: boolean,
) {
  let synced = 0
  const next = readSessions().map((session) => {
    if (!predicate(session) || (session.enabled !== false) === enabled) return session
    synced += 1
    return { ...session, enabled }
  })
  writeSessions(next)
  return synced
}

function toggleToolkit(id: string, enabled: boolean) {
  const toolkit = supervisorToolkits.find((item) => item.id === id && !item.deletedAt)
  if (!toolkit) return problem(404, 'Toolkit not found.')
  toolkit.enabled = enabled
  toolkit.version += 1
  const synced = syncSessions((session) => session.toolkitId === toolkit.id, enabled)
  return HttpResponse.json({ ...withToolkitAlignment(toolkit), syncedSessionCount: synced })
}

function toggleSubtask(toolkitId: string, subtaskId: string, enabled: boolean) {
  const toolkit = supervisorToolkits.find((item) => item.id === toolkitId && !item.deletedAt)
  const subtask = toolkit?.subtasks.find((item) => item.id === subtaskId && !item.deletedAt)
  if (!toolkit || !subtask) return problem(404, 'The Subtask was not found.')
  subtask.enabled = enabled
  toolkit.version += 1
  const synced = syncSessions((session) => session.subtaskId === subtask.id, enabled)
  return HttpResponse.json({ ...withToolkitAlignment(toolkit), syncedSessionCount: synced })
}

function withSessionCounts(toolkit: SupervisorToolkit): SupervisorToolkit {
  const sessions = readSessions().filter((session) => session.toolkitId === toolkit.id)
  return {
    ...toolkit,
    enabled: toolkit.enabled !== false,
    referencedEnabledSessionCount: sessions.filter((session) => session.enabled !== false).length,
    referencedDisabledSessionCount: sessions.filter((session) => session.enabled === false).length,
    subtasks: toolkit.subtasks.map((subtask) => {
      const rows = sessions.filter((session) => session.subtaskId === subtask.id)
      return {
        ...subtask,
        enabled: subtask.enabled !== false,
        referencedEnabledSessionCount: rows.filter((session) => session.enabled !== false).length,
        referencedDisabledSessionCount: rows.filter((session) => session.enabled === false).length,
      }
    }),
  }
}

type SimulationShell = {
  latestForecastByScenario?: Record<string, unknown>
  latestMonthlySizingByScenario?: Record<string, unknown>
  latestDailySizingByScenario?: Record<string, unknown>
  latestSlotByScenario?: Record<string, unknown>
  stubRuns: Array<{ scenarioId: string; runType: string; status: string }>
  scenarios: Array<{ id: string }>
}

function committedScenarioCount(shell: SimulationShell) {
  const ids = new Set<string>()
  for (const run of shell.stubRuns) {
    if (
      run.status === 'ACCEPTED' &&
      (run.runType === 'FORECAST' ||
        run.runType === 'MONTHLY_SIZING' ||
        run.runType === 'DAILY' ||
        run.runType === 'SLOT')
    ) {
      ids.add(run.scenarioId)
    }
  }
  for (const map of [
    shell.latestForecastByScenario,
    shell.latestMonthlySizingByScenario,
    shell.latestDailySizingByScenario,
    shell.latestSlotByScenario,
  ]) {
    for (const id of Object.keys(map ?? {})) ids.add(id)
  }
  return ids.size
}

function clearCommittedSimulationResults(shell: SimulationShell) {
  const cleared = committedScenarioCount(shell)
  shell.latestForecastByScenario = {}
  shell.latestMonthlySizingByScenario = {}
  shell.latestDailySizingByScenario = {}
  shell.latestSlotByScenario = {}
  shell.stubRuns = shell.stubRuns.filter(
    (run) =>
      !(
        run.runType === 'FORECAST' ||
        run.runType === 'MONTHLY_SIZING' ||
        run.runType === 'DAILY' ||
        run.runType === 'SLOT'
      ),
  )
  return cleared
}

function sameKey(a: SharedKpiKey, b: SharedKpiKey) {
  return a.carrier === b.carrier && a.site === b.site && a.customerCountry === b.customerCountry
}

function toolkitAlignment(toolkit: SupervisorToolkit) {
  const candidates = kpiCandidates(toolkit.pl3Code)
  const lines = toolkit.sharedKpiSelections.map((selection) => {
    const current = candidates.find((candidate) => sameKey(candidate, selection))
    return {
      carrier: selection.carrier,
      site: selection.site,
      customerCountry: selection.customerCountry,
      missing: !current,
      currentDeliveryHc: current?.deliveryHc ?? null,
    }
  })
  return {
    structuralDrift: lines.some((line) => line.missing),
    outOfScope: false,
    currentMonthlySyncDate: activeTimesheetSyncDate,
    currentDeliveryHc: lines.reduce((sum, line) => sum + Number(line.currentDeliveryHc || 0), 0),
    lines,
  }
}

function withToolkitAlignment(toolkit: SupervisorToolkit) {
  const alignment = toolkitAlignment(toolkit)
  return withSessionCounts({ ...toolkit, outOfSync: alignment.structuralDrift, alignment })
}

function exerciseAlignment(exercise: Exercise) {
  if (exercise.workflowStatus === 'APPROVED') {
    return null
  }
  const candidates = kpiCandidates(exercise.snapshot.toolkit.pl3Code)
  const lines = exercise.snapshot.sharedKpis.map((selection) => {
    const current = candidates.find((candidate) => sameKey(candidate, selection))
    return {
      carrier: selection.carrier,
      site: selection.site,
      customerCountry: selection.customerCountry,
      missing: !current,
      currentDeliveryHc: current?.deliveryHc ?? null,
    }
  })
  return {
    structuralDrift: lines.some((line) => line.missing),
    outOfScope: false,
    currentMonthlySyncDate: activeTimesheetSyncDate,
    currentDeliveryHc: lines.reduce((sum, line) => sum + Number(line.currentDeliveryHc || 0), 0),
    lines,
  }
}

function withExerciseAlignment(exercise: Exercise) {
  const deliveryHc =
    exercise.deliveryHc ??
    exercise.snapshot.sharedKpis.reduce((sum, item) => sum + Number(item.deliveryHc || 0), 0)
  return { ...exercise, deliveryHc, timesheetAlignment: exerciseAlignment(exercise) }
}

function resolvedKpis(toolkit: SupervisorToolkit) {
  const candidates = kpiCandidates(toolkit.pl3Code)
  return toolkit.sharedKpiSelections.map((selection) => {
    const current = candidates.find((candidate) => sameKey(candidate, selection))
    return {
      ...selection,
      deliveryHc: current?.deliveryHc ?? 0,
      valid: Boolean(current),
    }
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
      .filter((item) => !item.deletedAt && item.enabled !== false)
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

function derivedSupport(
  ctx: { exercise: Exercise; shell: ReturnType<typeof ensureShell> },
  item: {
    frequencyCode: string
    volume: number
    workloadPerUnitMinutes: number
  },
) {
  const setup = teamSetupView(ctx.exercise, ctx.shell)
  const multiplier = annualMultiplier(item.frequencyCode, setup.workingDaysPerYear)
  const hours = hoursPerYear(Number(item.volume), Number(item.workloadPerUnitMinutes), multiplier)
  return {
    annualMultiplier: multiplier,
    workloadPerYearHours: hours,
    supportFte: supportFte(hours, fteAnnualHours(setup)),
  }
}

function editable(exercise: Exercise) {
  return exercise.canEdit && exercise.workflowStatus === 'IN_PROGRESS'
}

function mockSeriesImportPreview(
  grain: 'MONTHLY' | 'DAILY',
  keys: string[],
) {
  return {
    grain,
    fileRowCount: Math.max(keys.length, 1),
    overwritten: keys,
    added: [] as string[],
    kept: [] as string[],
  }
}

function mockSlotImportPreview(exercise: Exercise) {
  const startDate = exercise.slotStartDate ?? '2026-06-01'
  const weeks = exercise.slotWeeks ?? 1
  const totalSlots = slotTrainKeys(startDate, weeks).length
  return {
    startDate,
    weeks,
    fileRowCount: totalSlots,
    paddedCount: 0,
    totalSlots,
    currentStartDate: exercise.slotStartDate,
    currentWeeks: exercise.slotWeeks,
  }
}

function isWorking(scenario: { status: string }) {
  return scenario.status === 'DRAFT'
}

function officialPackageProblem(
  ctx: { exercise: Exercise; shell: ReturnType<typeof ensureShell> },
  scenario: { id: string; rightSizingHc: number | null },
  gate: 'Official' | 'Submit',
) {
  if (scenario.rightSizingHc == null || scenario.rightSizingHc <= 0) {
    return problem(422, `Right Sizing HC must be a positive number before ${gate}.`)
  }
  const shell = ctx.shell as {
    latestMonthlySizingByScenario?: Record<string, { rows?: Array<{ rightSizingHc?: number }> }>
    latestDailySizingByScenario?: Record<string, unknown>
    latestSlotByScenario?: Record<string, unknown>
  }
  const monthly = shell.latestMonthlySizingByScenario?.[scenario.id]
  const daily = shell.latestDailySizingByScenario?.[scenario.id]
  if (!monthly || !daily) {
    return problem(422, `Save Forecast and Sizing (monthly and daily) before ${gate}.`)
  }
  const rows = monthly.rows ?? []
  const expected = Number(scenario.rightSizingHc)
  if (
    rows.length === 0 ||
    rows.some((row) => Number(row.rightSizingHc) !== expected)
  ) {
    return problem(
      422,
      `Saved sizing results do not match the current Right Sizing HC. Re-run Preview / Save sizing before ${gate}.`,
    )
  }
  return null
}

function syncFlags(exercise: Exercise) {
  const shell = ensureShell(exercise)
  exercise.officialScenarioId =
    exercise.officialScenarioId ?? shell.submitted?.scenarioId ?? null
  exercise.submissionStatus = shell.submitted?.submissionStatus ?? null
  exercise.canEdit = exercise.workflowStatus === 'IN_PROGRESS'
  exercise.canDelete = exercise.canEdit
  exercise.canSubmit = Boolean(exercise.officialScenarioId) && exercise.canEdit
  const ready = shell.submitted?.steps.find((step) => step.routingStatus === 'PENDING')
  if (exercise.workflowStatus === 'UNDER_REVIEW' && shell.submitted) {
    exercise.currentStep = shell.submitted.currentStep
    exercise.requiredRole = shell.submitted.requiredRole ?? ready?.requiredRoleCode ?? null
    exercise.currentReviewer = ready?.assigneeDisplayName ?? null
    exercise.lastDecisionComment = null
  } else if (shell.submitted?.submissionStatus === 'RETURNED') {
    const returned = [...shell.submitted.actions]
      .reverse()
      .find((action) => action.actionType === 'RETURNED')
    exercise.currentStep = returned?.stepNo ?? null
    exercise.requiredRole = returned?.actorRoleCode ?? null
    exercise.currentReviewer = returned?.actorDisplayName ?? null
    exercise.lastDecisionComment = returned?.comments ?? null
  } else {
    exercise.currentStep = null
    exercise.requiredRole = null
    exercise.currentReviewer = null
    exercise.lastDecisionComment = null
  }
}

const OPEN_LIKE_STATUSES = new Set(['OPEN', 'AWAITING'])

function toDateKey(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((name): name is string => Boolean(name)))].sort()
}

function matchesReviewStage(exercise: Exercise, reviewStage: string) {
  if (reviewStage === 'SUPERVISOR') {
    return exercise.workflowStatus === 'IN_PROGRESS'
  }
  return exercise.workflowStatus === 'UNDER_REVIEW' && exercise.requiredRole === reviewStage
}

function matchesExerciseList(exercise: Exercise, params: URLSearchParams) {
  const code = params.get('exerciseCode')?.trim().toLowerCase()
  if (code && !exercise.exerciseCode.toLowerCase().includes(code)) return false
  const toolkitName = params.get('toolkitName')
  if (toolkitName && exercise.snapshot.toolkit.name !== toolkitName) return false
  const pl3Name = params.get('pl3Name')
  if (pl3Name && exercise.snapshot.toolkit.pl3Name !== pl3Name) return false
  const workflowStatus = params.get('workflowStatus')
  if (workflowStatus && exercise.workflowStatus !== workflowStatus) return false
  const reviewStage = params.get('reviewStage')
  if (reviewStage && !matchesReviewStage(exercise, reviewStage)) return false
  const handler = params.get('handler')
  if (handler && exercise.currentReviewer !== handler) return false
  const officialScenario = params.get('officialScenario')
  if (officialScenario === 'ASSIGNED' && !exercise.officialScenarioId) return false
  if (officialScenario === 'UNASSIGNED' && exercise.officialScenarioId) return false
  const created = toDateKey(exercise.createdAt)
  const createdFrom = params.get('createdFrom')
  const createdTo = params.get('createdTo')
  if (createdFrom && created < createdFrom) return false
  if (createdTo && created > createdTo) return false
  const submitted = toDateKey(exercise.submittedAt)
  const submittedFrom = params.get('submittedFrom')
  const submittedTo = params.get('submittedTo')
  if (submittedFrom && (!submitted || submitted < submittedFrom)) return false
  if (submittedTo && (!submitted || submitted > submittedTo)) return false
  const archivedFrom = params.get('archivedFrom')
  const archivedTo = params.get('archivedTo')
  if (archivedFrom && (!submitted || submitted < archivedFrom)) return false
  if (archivedTo && (!submitted || submitted > archivedTo)) return false
  return true
}

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

  http.get('*/api/v1/toolkits/managed', async ({ request }) => {
    await delay(80)
    const url = new URL(request.url)
    const name = (url.searchParams.get('name') ?? '').trim().toLowerCase()
    const pl3Name = (url.searchParams.get('pl3Name') ?? '').trim()
    const enabled = url.searchParams.get('enabled')
    const source = supervisorToolkits.filter((item) => !item.deletedAt)
    const pl3Names = [...new Set(source.map((item) => item.pl3Name).filter(Boolean))].sort()
    const items = source.filter((item) => {
      const matchesName = !name || item.name.toLowerCase().includes(name)
      const matchesPl3 = !pl3Name || item.pl3Name === pl3Name
      const matchesEnabled =
        enabled !== 'true' && enabled !== 'false'
          ? true
          : (item.enabled !== false) === (enabled === 'true')
      return matchesName && matchesPl3 && matchesEnabled
    })
    const paged = pageOf(
      items.map(withToolkitAlignment),
      pageParams(url).page,
      pageParams(url).pageSize,
    )
    return HttpResponse.json({ ...paged, pl3Names })
  }),

  http.get('*/api/v1/toolkits/:id/export', ({ params }) => {
    const toolkit = supervisorToolkits.find((item) => item.id === params.id && !item.deletedAt)
    if (!toolkit) return problem(404, 'Toolkit not found.')
    const day = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const safe = toolkit.name.replace(/[^A-Za-z0-9._-]+/g, '_')
    return new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safe}_export_${day}.xlsx"`,
      },
    })
  }),

  http.get('*/api/v1/toolkits/:id', ({ params }) => {
    const toolkit = supervisorToolkits.find((item) => item.id === params.id && !item.deletedAt)
    return toolkit ? HttpResponse.json(withToolkitAlignment(toolkit)) : problem(404, 'Toolkit not found.')
  }),

  http.post('*/api/v1/toolkits', async ({ request }) => {
    const input = (await request.json()) as ToolkitEditorPayload
    if (!input.name.trim() || !input.pl3Code) {
      return problem(422, 'Name and hierarchy are required.')
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
      enabled: true,
    }
    supervisorToolkits.unshift(toolkit)
    return HttpResponse.json(withToolkitAlignment(toolkit), { status: 201 })
  }),

  http.put('*/api/v1/toolkits/:id', async ({ params, request }) => {
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
      subtasks: current.subtasks,
      sharedKpiSelections: input.sharedKpiSelections.map((item) => ({ ...item })),
      version: current.version + 1,
    }
    supervisorToolkits[index] = updated
    return HttpResponse.json(withToolkitAlignment(updated))
  }),

  http.post('*/api/v1/toolkits/:id/enable', ({ params }) => toggleToolkit(String(params.id), true)),
  http.post('*/api/v1/toolkits/:id/disable', ({ params }) => toggleToolkit(String(params.id), false)),
  http.post('*/api/v1/toolkits/:id/subtasks', async ({ params, request }) => {
    const toolkit = supervisorToolkits.find((item) => item.id === params.id && !item.deletedAt)
    if (!toolkit) return problem(404, 'Toolkit not found.')
    const input = (await request.json()) as { name?: string; description?: string; displayOrder?: number }
    const name = input.name?.trim() ?? ''
    if (!name) return problem(422, 'Enter a subtask name.')
    toolkit.subtasks.push({
      id: crypto.randomUUID(),
      name,
      description: input.description ?? '',
      displayOrder: input.displayOrder ?? toolkit.subtasks.length + 1,
      deletedAt: null,
      enabled: true,
    })
    toolkit.version += 1
    return HttpResponse.json(withToolkitAlignment(toolkit), { status: 201 })
  }),
  http.put('*/api/v1/toolkits/:id/subtasks/:subtaskId', async ({ params, request }) => {
    const toolkit = supervisorToolkits.find((item) => item.id === params.id && !item.deletedAt)
    const subtask = toolkit?.subtasks.find((item) => item.id === params.subtaskId && !item.deletedAt)
    if (!toolkit || !subtask) return problem(404, 'The Subtask was not found.')
    const input = (await request.json()) as { name?: string; description?: string; displayOrder?: number }
    const name = input.name?.trim() ?? ''
    if (!name) return problem(422, 'Enter a subtask name.')
    subtask.name = name
    if (input.description !== undefined) subtask.description = input.description
    if (input.displayOrder !== undefined) subtask.displayOrder = input.displayOrder
    toolkit.version += 1
    return HttpResponse.json(withToolkitAlignment(toolkit))
  }),
  http.post('*/api/v1/toolkits/:id/subtasks/:subtaskId/enable', ({ params }) =>
    toggleSubtask(String(params.id), String(params.subtaskId), true),
  ),
  http.post('*/api/v1/toolkits/:id/subtasks/:subtaskId/disable', ({ params }) =>
    toggleSubtask(String(params.id), String(params.subtaskId), false),
  ),

  http.get('*/api/v1/exercises', ({ request }) => {
    exercises.forEach(syncFlags)
    const params = new URL(request.url).searchParams
    const tab = params.get('tab') || 'IN_PROGRESS'
    const tabStatuses = tab === 'ARCHIVED'
      ? new Set(['APPROVED'])
      : new Set(['IN_PROGRESS', 'UNDER_REVIEW'])
    const source = exercises.filter((item) => tabStatuses.has(item.workflowStatus))
    const items = source.filter((item) => matchesExerciseList(item, params))
    const paged = pageOf(
      items.map(withExerciseAlignment),
      Number(params.get('page') ?? 1),
      Number(params.get('pageSize') ?? 10),
    )
    return HttpResponse.json({
      ...paged,
      toolkitNames: uniqueSorted(source.map((item) => item.snapshot.toolkit.name)),
      pl3Names: uniqueSorted(source.map((item) => item.snapshot.toolkit.pl3Name)),
      reviewerNames: uniqueSorted(source.map((item) => item.currentReviewer)),
    })
  }),

  http.post('*/api/v1/exercises', async ({ request }) => {
    const input = (await request.json()) as CreateExerciseInput
    const toolkit = supervisorToolkits.find(
      (item) => item.id === input.toolkitId && !item.deletedAt,
    )
    if (!toolkit) return problem(404, 'Toolkit not found.')
    if (toolkit.enabled === false) return problem(409, 'Enable the Toolkit before creating an Exercise.')
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.sizingMonth)) {
      return problem(422, 'Exercise dates are invalid.')
    }
    const frozen = snapshot(toolkit)
    if (frozen.sharedKpis.some((item) => !item.valid)) {
      return problem(422, 'Toolkit snapshot is not valid for Exercise creation.')
    }
    const exercise: Exercise = {
      ...input,
      slotStartDate: null,
      slotWeeks: null,
      tmsFrom: null,
      tmsTo: null,
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
        exercise: withExerciseAlignment(exercise),
        notices: [
          'Team Setup, Production Support, and Calendar copied from the Toolkit.',
          'Volume Input filled from Toolkit history for this Sizing Month.',
        ],
      },
      { status: 201 },
    )
  }),

  http.get('*/api/v1/exercises/:id', ({ params }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    return HttpResponse.json(withExerciseAlignment(exercise))
  }),

  http.put('*/api/v1/exercises/:id/periods', async ({ params, request }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    if (!exercise.canEdit) return problem(422, 'Exercise periods can only be changed during Supervisor Sizing.')
    const body = (await request.json()) as Pick<CreateExerciseInput, 'sizingMonth'>
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.sizingMonth)) {
      return problem(422, 'Exercise dates are invalid.')
    }
    const previousYear = exercise.sizingMonth.slice(0, 4)
    const nextYear = body.sizingMonth.slice(0, 4)
    const sizingChanged = body.sizingMonth !== exercise.sizingMonth
    Object.assign(exercise, {
      sizingMonth: body.sizingMonth,
      version: exercise.version + 1,
    })
    const notices: string[] = []
    if (previousYear !== nextYear) {
      notices.push(`Working Days / Year computed for ${nextYear}.`)
    }
    if (sizingChanged) {
      seedTrainVolumes(exercise, ensureShell(exercise))
      notices.push(
        'Monthly and Daily Volume were reset from Toolkit for the new Sizing Month. Volume edits on this Exercise were discarded.',
      )
      const shell = ensureShell(exercise) as SimulationShell
      const cleared = clearCommittedSimulationResults(shell)
      if (cleared > 0) {
        notices.push(
          `Cleared saved Forecast and Simulation results for ${cleared} scenario(s). Re-run Preview / Save sizing on each scenario.`,
        )
      }
    }
    return HttpResponse.json({ exercise: withExerciseAlignment(exercise), notices })
  }),

  http.put('*/api/v1/exercises/:id/tms-period', async ({ params, request }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    if (!exercise.canEdit) return problem(422, 'TMS period can only be changed during Supervisor Sizing.')
    const body = (await request.json()) as { tmsFrom?: string; tmsTo?: string }
    if (!body.tmsFrom || !body.tmsTo || body.tmsTo < body.tmsFrom) {
      return problem(422, 'Exercise dates are invalid.')
    }
    const tmsChanged = body.tmsFrom !== exercise.tmsFrom || body.tmsTo !== exercise.tmsTo
    Object.assign(exercise, {
      tmsFrom: body.tmsFrom,
      tmsTo: body.tmsTo,
      version: exercise.version + 1,
    })
    const shell = ensureShell(exercise)
    applyDemoTms(shell)
    const notices = ['Linked COMPLETED TMS session(s) for the Exercise TMS period.']
    if (tmsChanged) {
      const cleared = clearCommittedSimulationResults(shell as SimulationShell)
      if (cleared > 0) {
        notices.push(
          `Cleared saved Forecast and Simulation results for ${cleared} scenario(s). Re-run Preview / Save sizing on each scenario.`,
        )
      }
    }
    return HttpResponse.json({ exercise: withExerciseAlignment(exercise), notices })
  }),

  http.delete('*/api/v1/exercises/:id/tms-period', ({ params }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    if (!exercise.canEdit) return problem(422, 'TMS period can only be changed during Supervisor Sizing.')
    const hadPeriod = Boolean(exercise.tmsFrom && exercise.tmsTo)
    Object.assign(exercise, {
      tmsFrom: null,
      tmsTo: null,
      version: exercise.version + 1,
    })
    const shell = ensureShell(exercise)
    Object.assign(shell, emptyTms())
    const notices = ['TMS period cleared. Linked sessions and the SYSTEM median were removed.']
    if (hadPeriod) {
      const cleared = clearCommittedSimulationResults(shell as SimulationShell)
      if (cleared > 0) {
        notices.push(
          `Cleared saved Forecast and Simulation results for ${cleared} scenario(s). Re-run Preview / Save sizing on each scenario.`,
        )
      }
    }
    return HttpResponse.json({ exercise: withExerciseAlignment(exercise), notices })
  }),

  http.put('*/api/v1/exercises/:id/slot-period', async ({ params, request }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    if (!exercise.canEdit) return problem(422, 'Slot Period can only be changed during Supervisor Sizing.')
    const body = (await request.json()) as { slotStartDate?: string; slotWeeks?: number }
    if (!body.slotStartDate || !body.slotWeeks || body.slotWeeks < 1 || body.slotWeeks > 12) {
      return problem(422, 'Please complete the Slot Period.')
    }
    Object.assign(exercise, {
      slotStartDate: body.slotStartDate,
      slotWeeks: body.slotWeeks,
      version: exercise.version + 1,
    })
    const shell = ensureShell(exercise) as SimulationShell
    replaceEmptySlotGrid(exercise, shell)
    shell.latestSlotByScenario = {}
    shell.stubRuns = shell.stubRuns.filter((run) => run.runType !== 'SLOT')
    return HttpResponse.json({
      exercise: withExerciseAlignment(exercise),
      volumes: shell.slotVolumes,
      notices: ['Per-slot Volume grid generated for the selected Slot Period.'],
    })
  }),

  http.delete('*/api/v1/exercises/:id/slot-period', ({ params }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    if (!exercise.canEdit) return problem(422, 'Slot Period can only be changed during Supervisor Sizing.')
    Object.assign(exercise, {
      slotStartDate: null,
      slotWeeks: null,
      version: exercise.version + 1,
    })
    const shell = ensureShell(exercise) as SimulationShell
    shell.slotVolumes = []
    shell.latestSlotByScenario = {}
    shell.stubRuns = shell.stubRuns.filter((run) => run.runType !== 'SLOT')
    return HttpResponse.json({
      exercise: withExerciseAlignment(exercise),
      volumes: [],
      notices: ['Slot Period cleared.'],
    })
  }),

  http.get('*/api/v1/exercises/:id/committed-results', ({ params }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    return HttpResponse.json({ scenarioCount: committedScenarioCount(ensureShell(exercise)) })
  }),

  http.post('*/api/v1/exercises/:id/committed-results/clear', ({ params }) => {
    const exercise = findExercise(params.id)
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    if (!exercise.canEdit) return problem(409, 'The Exercise is not editable in its current workflow status.')
    const cleared = clearCommittedSimulationResults(ensureShell(exercise))
    return HttpResponse.json({ scenarioCount: cleared })
  }),

  http.delete('*/api/v1/exercises/:id', ({ params }) => {
    const index = exercises.findIndex((item) => item.id === params.id)
    const exercise = exercises[index]
    if (!exercise) return problem(404, 'Exercise not found.')
    syncFlags(exercise)
    if (!exercise.canDelete) return problem(409, 'Exercise cannot be deleted.')
    exercises.splice(index, 1)
    exerciseShells.delete(exercise.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/v1/exercises/:id/team-setup', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(teamSetupView(ctx.exercise, ctx.shell))
  }),

  http.put('*/api/v1/exercises/:id/team-setup', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as TeamSetupRequest
    ctx.shell.teamSetup = {
      ...ctx.shell.teamSetup,
      ...body,
      version: ctx.shell.teamSetup.version + 1,
    }
    return HttpResponse.json(teamSetupView(ctx.exercise, ctx.shell))
  }),

  http.get('*/api/v1/exercises/:id/production-support', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.support.map((item) => ({ ...item, ...derivedSupport(ctx, item) })))
  }),

  http.post('*/api/v1/exercises/:id/production-support', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as SupportItemRequest
    const category = supportCategoryStore.lookup(body.categoryId)
    if (!category || !body.activity?.trim()) return problem(422, 'Category and Activity are required.')
    const item = {
      id: crypto.randomUUID(),
      lineageId: crypto.randomUUID(),
      categoryId: category.id,
      category: category.name,
      activity: body.activity.trim(),
      frequencyCode: body.frequencyCode,
      volume: body.volume,
      unitOfMeasure: body.unitOfMeasure,
      workloadPerUnitMinutes: body.workloadPerUnitMinutes,
      comments: body.comments ?? null,
      ...derivedSupport(ctx, body),
    }
    ctx.shell.support.push(item)
    return HttpResponse.json(item, { status: 201 })
  }),

  http.put(
    '*/api/v1/exercises/:id/production-support/:itemId',
    async ({ params, request }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const index = ctx.shell.support.findIndex((item) => item.id === params.itemId)
      const current = ctx.shell.support[index]
      if (!current) return problem(404, 'The support item was not found.')
      const body = (await request.json()) as SupportItemRequest
      const category = supportCategoryStore.lookup(body.categoryId)
      if (!category || !body.activity?.trim()) return problem(422, 'Category and Activity are required.')
      const updated = {
        ...current,
        categoryId: category.id,
        category: category.name,
        activity: body.activity.trim(),
        frequencyCode: body.frequencyCode,
        volume: body.volume,
        unitOfMeasure: body.unitOfMeasure,
        workloadPerUnitMinutes: body.workloadPerUnitMinutes,
        comments: body.comments ?? null,
        ...derivedSupport(ctx, body),
      }
      ctx.shell.support[index] = updated
      return HttpResponse.json(updated)
    },
  ),

  http.delete('*/api/v1/exercises/:id/production-support/:itemId', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const index = ctx.shell.support.findIndex((item) => item.id === params.itemId)
    if (index < 0) return problem(404, 'The support item was not found.')
    ctx.shell.support.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/v1/exercises/:id/production-support/export-template', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="support-template.xlsx"',
      },
    }),
  ),
  http.get('*/api/v1/exercises/:id/production-support/export', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="production-support.xlsx"',
      },
    }),
  ),
  http.post('*/api/v1/exercises/:id/production-support/import', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    return HttpResponse.json(ctx.shell.support.map((item) => ({ ...item, ...derivedSupport(ctx, item) })))
  }),

  http.get('*/api/v1/exercises/:id/calendar', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.calendar)
  }),

  http.put('*/api/v1/exercises/:id/calendar', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as CalendarRequest
    const holidays = (body.holidays ?? []).map((holiday) => ({
      id: crypto.randomUUID(),
      holidayDate: holiday.holidayDate,
      holidayName: holiday.holidayName,
      holidayType: holiday.holidayType,
    }))
    ctx.shell.calendar = {
      holidays,
    }
    return HttpResponse.json(ctx.shell.calendar)
  }),

  http.get('*/api/v1/exercises/:id/calendar/export-template', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="calendar-template.xlsx"',
      },
    }),
  ),
  http.get('*/api/v1/exercises/:id/calendar/export', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="calendar.xlsx"',
      },
    }),
  ),
  http.post('*/api/v1/exercises/:id/calendar/import', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    return HttpResponse.json(ctx.shell.calendar)
  }),

  http.get('*/api/v1/exercises/:id/volumes/toolkit-summary', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json({
      monthlyCount: 0,
      monthlyFrom: null,
      monthlyTo: null,
      dailyCount: 0,
      dailyFrom: null,
      dailyTo: null,
    })
  }),

  http.get('*/api/v1/exercises/:id/volumes/toolkit-points', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json({ monthly: [], daily: [] })
  }),

  http.get('*/api/v1/exercises/:id/volumes/monthly', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.monthlyVolumes)
  }),

  http.put('*/api/v1/exercises/:id/volumes/monthly', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as MonthlyVolumeRequest[]
    ctx.shell.monthlyVolumes = body
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({
        id: crypto.randomUUID(),
        month: row.month,
        actualVolume: row.actualVolume ?? null,
        commercialRatio: row.commercialRatio ?? null,
        sourceType: 'MANUAL',
        importBatchId: null,
      }))
    return HttpResponse.json(ctx.shell.monthlyVolumes)
  }),

  http.get('*/api/v1/exercises/:id/volumes/daily', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.dailyVolumes)
  }),

  http.put('*/api/v1/exercises/:id/volumes/daily', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const body = (await request.json()) as DailyVolumeRequest[]
    ctx.shell.dailyVolumes = body
      .slice()
      .sort((a, b) => a.volumeDate.localeCompare(b.volumeDate))
      .map((row) => ({
        id: crypto.randomUUID(),
        volumeDate: row.volumeDate,
        actualVolume: row.actualVolume ?? null,
        dailyAdjustmentRatio: row.dailyAdjustmentRatio ?? null,
        sourceType: 'MANUAL',
        importBatchId: null,
      }))
    return HttpResponse.json(ctx.shell.dailyVolumes)
  }),

  http.get('*/api/v1/exercises/:id/volumes/slot', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.slotVolumes)
  }),

  http.put('*/api/v1/exercises/:id/volumes/slot', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    if (!ctx.exercise.slotStartDate || !ctx.exercise.slotWeeks) {
      return problem(422, 'Set a Slot Period to generate the per-slot grid.')
    }
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
      actualVolume: row.actualVolume,
      sourceType: 'MANUAL',
      importBatchId: null,
    }))
    return HttpResponse.json(ctx.shell.slotVolumes)
  }),

  http.get('*/api/v1/exercises/:id/volumes/monthly/export-template', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-monthly-template.xlsx"',
      },
    }),
  ),
  http.get('*/api/v1/exercises/:id/volumes/monthly/export', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-monthly.xlsx"',
      },
    }),
  ),
  http.post('*/api/v1/exercises/:id/volumes/monthly/import-preview', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    return HttpResponse.json(
      mockSeriesImportPreview(
        'MONTHLY',
        ctx.shell.monthlyVolumes.map((row) => row.month),
      ),
    )
  }),
  http.post('*/api/v1/exercises/:id/volumes/monthly/import', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    return HttpResponse.json(ctx.shell.monthlyVolumes)
  }),
  http.get('*/api/v1/exercises/:id/volumes/daily/export-template', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-daily-template.xlsx"',
      },
    }),
  ),
  http.get('*/api/v1/exercises/:id/volumes/daily/export', () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-daily.xlsx"',
      },
    }),
  ),
  http.post('*/api/v1/exercises/:id/volumes/daily/import-preview', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    return HttpResponse.json(
      mockSeriesImportPreview(
        'DAILY',
        ctx.shell.dailyVolumes.map((row) => row.volumeDate),
      ),
    )
  }),
  http.post('*/api/v1/exercises/:id/volumes/daily/import', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    return HttpResponse.json(ctx.shell.dailyVolumes)
  }),
  http.get('*/api/v1/exercises/:id/volumes/slot/export-template', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!ctx.exercise.slotStartDate || !ctx.exercise.slotWeeks) {
      return problem(422, 'Set a Slot Period to generate the per-slot grid.')
    }
    return HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-slot-template.xlsx"',
      },
    })
  }),
  http.get('*/api/v1/exercises/:id/volumes/slot/export', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!ctx.exercise.slotStartDate || !ctx.exercise.slotWeeks) {
      return problem(422, 'Set a Slot Period to generate the per-slot grid.')
    }
    return HttpResponse.arrayBuffer(new ArrayBuffer(0), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="volume-slot.xlsx"',
      },
    })
  }),
  http.post('*/api/v1/exercises/:id/volumes/slot/import-preview', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    return HttpResponse.json(mockSlotImportPreview(ctx.exercise))
  }),
  http.post('*/api/v1/exercises/:id/volumes/slot/import', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const preview = mockSlotImportPreview(ctx.exercise)
    Object.assign(ctx.exercise, {
      slotStartDate: preview.startDate,
      slotWeeks: preview.weeks,
      version: ctx.exercise.version + 1,
    })
    const shell = ctx.shell as SimulationShell
    replaceEmptySlotGrid(ctx.exercise, shell)
    shell.latestSlotByScenario = {}
    shell.stubRuns = (shell.stubRuns ?? []).filter((run) => run.runType !== 'SLOT')
    return HttpResponse.json({
      ...preview,
      volumes: shell.slotVolumes,
      notices: [
        `Per-slot Volume imported for ${preview.startDate} (${preview.weeks} week${preview.weeks === 1 ? '' : 's'}).`,
      ],
    })
  }),

  http.get('*/api/v1/exercises/:id/cycle-time/chart', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return passthrough()
    return HttpResponse.json(ctx.shell.cycleTimeChart)
  }),

  http.get('*/api/v1/exercises/:id/cycle-time/active', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return passthrough()
    if (!ctx.shell.cycleTime) return problem(404, 'No active Cycle Time baseline.')
    const cycleTime = attachSystemTmsRatio(ctx.shell.cycleTime, {
      tmsFrom: ctx.exercise.tmsFrom,
      tmsTo: ctx.exercise.tmsTo,
      daily: ctx.shell.dailyVolumes,
      sessions: ctx.shell.tmsSessions,
    })
    return HttpResponse.json({
      ...cycleTime,
      files: cycleTime?.files ?? [],
    })
  }),

  http.get('*/api/v1/exercises/:id/cycle-time/sessions', ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return passthrough()
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') || 1)
    const pageSize = Number(url.searchParams.get('pageSize') || 10)
    return HttpResponse.json(pageOf(ctx.shell.tmsSessions, page, pageSize))
  }),

  http.post(
    '*/api/v1/exercises/:id/cycle-time/support-files',
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

  http.post('*/api/v1/exercises/:id/cycle-time/manual', async ({ params, request }) => {
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
    return HttpResponse.json(ctx.shell.cycleTime, { status: 201 })
  }),

  http.get('*/api/v1/exercises/:id/scenarios', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    return HttpResponse.json(ctx.shell.scenarios)
  }),

  http.post('*/api/v1/exercises/:id/scenarios', async ({ params, request }) => {
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
      version: 0,
      rightSizingHc: body.rightSizingHc != null && body.rightSizingHc > 0 ? body.rightSizingHc : null,
      shifts: [],
    }
    ctx.shell.scenarios.push(scenario)
    return HttpResponse.json(scenario, { status: 201 })
  }),

  http.get('*/api/v1/exercises/:id/scenarios/:scenarioId', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    const scenario = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
    return scenario ? HttpResponse.json(scenario) : problem(404, 'The Scenario was not found.')
  }),

  http.put(
    '*/api/v1/exercises/:id/scenarios/:scenarioId/commit',
    async ({ params, request }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const index = ctx.shell.scenarios.findIndex((item) => item.id === params.scenarioId)
      const current = ctx.shell.scenarios[index]
      if (!current) return problem(404, 'The Scenario was not found.')
      if (!isWorking(current)) return problem(409, 'Only a live scenario can be saved.')
      const body = (await request.json()) as {
        name: string
        description?: string | null
        rightSizingHc?: number | null
        shifts: Array<{
          shiftNo: number
          startTime: string
          durationMinutes: number
          headcount: number
          weekendCode: string
        }>
        results?: {
          forecast: { monthly: unknown; daily: unknown }
          monthly: unknown
          daily: unknown
          slot?: unknown | null
        } | null
      }
      if (!Array.isArray(body.shifts)) return problem(422, 'Shifts are required when saving a scenario.')
      if (body.shifts.length > 5) {
        return problem(422, 'A scenario can have at most 5 shifts.')
      }
      const updated = {
        ...current,
        name: body.name,
        description: body.description ?? null,
        version: current.version + 1,
        rightSizingHc:
          body.rightSizingHc === undefined
            ? current.rightSizingHc
            : body.rightSizingHc != null && body.rightSizingHc > 0
              ? body.rightSizingHc
              : null,
        shifts: body.shifts.map((row) => ({
          id: crypto.randomUUID(),
          shiftNo: row.shiftNo,
          startTime: row.startTime.length === 5 ? `${row.startTime}:00` : row.startTime,
          durationMinutes: row.durationMinutes,
          headcount: row.headcount,
          weekendCode: row.weekendCode,
        })),
      }
      ctx.shell.scenarios[index] = updated

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

  http.delete('*/api/v1/exercises/:id/scenarios/:scenarioId', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const index = ctx.shell.scenarios.findIndex((item) => item.id === params.scenarioId)
    const current = ctx.shell.scenarios[index]
    if (!current) return problem(404, 'The Scenario was not found.')
    if (!isWorking(current)) return problem(409, 'Only a live scenario can be modified.')
    if (ctx.exercise.officialScenarioId === current.id) {
      ctx.exercise.officialScenarioId = null
    }
    ctx.shell.scenarios.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/v1/exercises/:id/scenarios/:scenarioId/official', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
    const target = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
    if (!target) return problem(404, 'The Scenario was not found.')
    if (ctx.exercise.officialScenarioId === target.id) {
      return HttpResponse.json(target)
    }
    if (!isWorking(target)) {
      return problem(409, 'Only a live scenario can be marked Official.')
    }
    if (!ctx.shell.cycleTime?.active) {
      return problem(422, 'An active Cycle Time baseline is required before Official.')
    }
    const packageError = officialPackageProblem(ctx, target, 'Official')
    if (packageError) return packageError
    ctx.exercise.officialScenarioId = target.id
    syncFlags(ctx.exercise)
    return HttpResponse.json(target)
  }),

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
      if (!isWorking(scenario)) {
        return problem(409, 'Simulations can only run against a live scenario.')
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
    '*/api/v1/exercises/:id/scenarios/:scenarioId/forecast/latest',
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

  http.get(
    '*/api/v1/exercises/:id/scenarios/:scenarioId/simulations/monthly/latest',
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

  http.get(
    '*/api/v1/exercises/:id/scenarios/:scenarioId/simulations/daily/latest',
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
    '*/api/v1/exercises/:id/scenarios/:scenarioId/simulations/slot',
    async ({ params, request }) => {
      const ctx = requireExercise(params.id)
      if (!ctx) return problem(404, 'Exercise not found.')
      if (!editable(ctx.exercise)) return problem(409, 'Exercise is not editable.')
      const scenario = ctx.shell.scenarios.find((item) => item.id === params.scenarioId)
      if (!scenario) return problem(404, 'The Scenario was not found.')
      if (!isWorking(scenario)) {
        return problem(409, 'Simulations can only run against a live scenario.')
      }
      const body = (await request.json()) as {
        shifts?: Array<{
          shiftNo: number
          startTime: string
          durationMinutes: number
          headcount: number
          weekendCode: string
        }>
      }
      const shifts = body.shifts ?? []
      if (!shifts.length) {
        return problem(422, 'At least one shift is required before slot simulation.')
      }
      if (shifts.length > 5) {
        return problem(422, 'A scenario can have at most 5 shifts.')
      }
      const allEmpty =
        !ctx.shell.slotVolumes?.length ||
        ctx.shell.slotVolumes.every((row) => row.actualVolume == null)
      if (allEmpty) {
        return problem(422, 'Set Slot Period and fill Per-slot Volume first.')
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
        const raw = Number(volume.actualVolume) || 0
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
    '*/api/v1/exercises/:id/scenarios/:scenarioId/simulations/slot/latest',
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

  http.post('*/api/v1/exercises/:id/validations/submit-preview', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    syncFlags(ctx.exercise)
    if (!ctx.exercise.canSubmit) {
      return problem(409, 'Exercise must have an Official Scenario and be editable to submit.')
    }
    const official = ctx.shell.scenarios.find((item) => item.id === ctx.exercise.officialScenarioId)
    if (official) {
      const packageError = officialPackageProblem(ctx, official, 'Submit')
      if (packageError) return packageError
    }
    const dailyVsMonthly = dailyMonthlyVolumeCheck(
      ctx.shell.monthlyVolumes,
      ctx.shell.dailyVolumes,
    )
    const tmsRatio = tmsRatioFinding(
      ctx.exercise,
      ctx.shell.dailyVolumes,
      ctx.shell.tmsSessions,
      ctx.shell.cycleTime?.baselineType,
    )
    const findings = [
      {
        ruleCode: 'DAILY_VS_MONTHLY' as const,
        severity: dailyVsMonthly.severity,
        detail: dailyVsMonthly.detail,
      },
      ...(tmsRatio ? [tmsRatio] : []),
    ]
    const timesheetAlignment = exerciseAlignment(ctx.exercise)
    return HttpResponse.json({
      scenarioId: official?.id ?? ctx.exercise.officialScenarioId ?? '',
      findings,
      remarksRequired: findings.some((finding) => finding.severity === 'WARNING'),
      submitBlocked: false,
      timesheetAlignment,
      scopeAcknowledgementRequired: Boolean(timesheetAlignment?.structuralDrift),
      nextStep: 'Manager Review',
      nextPositionId: null,
      nextHandlerName: null,
      nextHandlerCcgid: null,
    })
  }),

  http.post('*/api/v1/exercises/:id/submit', async ({ params, request }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    syncFlags(ctx.exercise)
    if (!ctx.exercise.canSubmit) {
      return problem(409, 'Exercise must have an Official Scenario and be editable to submit.')
    }
    if (ctx.exercise.workflowStatus === 'UNDER_REVIEW' && ctx.shell.submitted) {
      return HttpResponse.json(ctx.shell.submitted, { status: 201 })
    }
    const body = ((await request.json().catch(() => ({}))) ?? {}) as SubmitRequest
    if (exerciseAlignment(ctx.exercise)?.structuralDrift && body.scopeAcknowledged !== true) {
      return problem(422, 'Confirm submitting with the frozen Shared KPI scope.')
    }
    const dailyVsMonthly = dailyMonthlyVolumeCheck(
      ctx.shell.monthlyVolumes,
      ctx.shell.dailyVolumes,
    )
    const tmsRatio = tmsRatioFinding(
      ctx.exercise,
      ctx.shell.dailyVolumes,
      ctx.shell.tmsSessions,
      ctx.shell.cycleTime?.baselineType,
    )
    const remarksRequired =
      dailyVsMonthly.severity === 'WARNING' || tmsRatio?.severity === 'WARNING'
    if (remarksRequired && !body.remarks?.trim()) {
      return problem(422, 'WARNING validation failures require remarks before Submit.')
    }
    const official = ctx.shell.scenarios.find((item) => item.id === ctx.exercise.officialScenarioId)
    if (official) {
      const packageError = officialPackageProblem(ctx, official, 'Submit')
      if (packageError) return packageError
    }
    const previous = ctx.shell.submitted
    const reopenable = previous
      && (previous.submissionStatus === 'RETURNED' || previous.submissionStatus === 'WITHDRAWN')
    const now = new Date().toISOString()
    if (reopenable && previous) {
      previous.actions.push({
        stepNo: 0,
        actionType: 'APPROVED',
        actorCcgid: crypto.randomUUID(),
        actorRoleCode: 'SUPERVISOR',
        comments: body.remarks ?? null,
        actionAt: now,
        requestId: body.requestId ?? request.headers.get('Idempotency-Key') ?? crypto.randomUUID(),
      })
      for (const step of previous.steps) {
        if (step.stepNo === 1) {
          step.routingStatus = 'PENDING'
        } else if (step.routingStatus === 'PENDING') {
          step.routingStatus = 'WITHDRAWN'
        }
      }
      if (!previous.steps.some((step) => step.stepNo === 1)) {
        previous.steps.push({
          stepNo: 1,
          requiredRoleCode: 'MANAGER',
          assigneeCcgid: crypto.randomUUID(),
          assigneeDisplayName: 'Grace Li',
          routingStatus: 'PENDING',
        })
      }
      previous.workflowStatus = 'UNDER_REVIEW'
      previous.submittedAt = now
      previous.scenarioId = official?.id ?? previous.scenarioId
      previous.scenarioName = official?.name ?? previous.scenarioName
      previous.submissionStatus = 'OPEN'
      previous.currentStep = 1
      previous.requiredRole = 'MANAGER'
      previous.remarks = body.remarks ?? null
      ctx.exercise.workflowStatus = 'UNDER_REVIEW'
      ctx.exercise.submittedAt = now
      syncFlags(ctx.exercise)
      return HttpResponse.json(previous, { status: 201 })
    }
    const details = {
      exerciseId: ctx.exercise.id,
      exerciseCode: ctx.exercise.exerciseCode,
      workflowStatus: 'UNDER_REVIEW',
      submittedAt: now,
      scenarioId: official?.id ?? '',
      scenarioName: official?.name ?? null,
      submissionId: crypto.randomUUID(),
      submissionStatus: 'OPEN',
      currentStep: 1,
      requiredRole: 'MANAGER',
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
      steps: [
        {
          stepNo: 1,
          requiredRoleCode: 'MANAGER',
          assigneeCcgid: crypto.randomUUID(),
          assigneeDisplayName: 'Grace Li',
          routingStatus: 'PENDING',
        },
      ],
      actions: [
        {
          stepNo: 0,
          actionType: 'APPROVED',
          actorCcgid: crypto.randomUUID(),
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

  http.get('*/api/v1/exercises/:id/submitted-details', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (!ctx.shell.submitted) return problem(404, 'No submission exists for this Exercise.')
    return HttpResponse.json({
      ...ctx.shell.submitted,
      workspace: buildApprovalWorkspace(ctx.shell.submitted, { inProgress: false }),
    })
  }),

  http.post('*/api/v1/exercises/:id/withdraw', ({ params }) => {
    const ctx = requireExercise(params.id)
    if (!ctx) return problem(404, 'Exercise not found.')
    if (ctx.exercise.workflowStatus !== 'UNDER_REVIEW' || !ctx.shell.submitted) {
      return problem(409, 'Only UNDER_REVIEW Exercises can be withdrawn.')
    }
    if (!OPEN_LIKE_STATUSES.has(ctx.shell.submitted.submissionStatus)) {
      return problem(409, 'Workflow is not OPEN and cannot be withdrawn.')
    }
    const now = new Date().toISOString()
    const step = ctx.shell.submitted.steps.find((item) => item.routingStatus === 'PENDING')
    if (step) step.routingStatus = 'WITHDRAWN'
    ctx.shell.submitted.actions.push({
      stepNo: step?.stepNo ?? ctx.shell.submitted.currentStep ?? 1,
      actionType: 'WITHDRAWN',
      actorCcgid: crypto.randomUUID(),
      actorRoleCode: 'SUPERVISOR',
      comments: null,
      actionAt: now,
      requestId: crypto.randomUUID(),
    })
    ctx.shell.submitted.submissionStatus = 'WITHDRAWN'
    ctx.shell.submitted.workflowStatus = 'IN_PROGRESS'
    ctx.exercise.workflowStatus = 'IN_PROGRESS'
    const official =
      ctx.shell.scenarios.find((item) => item.id === ctx.exercise.officialScenarioId) ??
      ctx.shell.scenarios.find((item) => item.id === ctx.shell.submitted?.scenarioId)
    if (official) {
      ctx.exercise.officialScenarioId = official.id
    }
    syncFlags(ctx.exercise)
    return HttpResponse.json({
      ...ctx.shell.submitted,
      workspace: buildApprovalWorkspace(ctx.shell.submitted, { inProgress: false }),
    })
  }),
]
