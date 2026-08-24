import type {
  CalendarView,
  CycleTimeBaseline,
  CycleTimeChartView,
  DailyVolume,
  Exercise,
  ExerciseTmsSession,
  MonthlyVolume,
  Scenario,
  SlotVolume,
  StubRun,
  SubmittedDetails,
  SupportItem,
  TeamSetup,
} from '@/features/exercise-management/types'
import {
  dailyTrainDates,
  slotTrainKeys,
} from '@/features/exercise-management/periodWindows'
import { computeNetworkDays } from '@/features/exercise-management/workingDays'

export type ExerciseShell = {
  teamSetup: TeamSetup
  support: SupportItem[]
  calendar: CalendarView
  monthlyVolumes: MonthlyVolume[]
  dailyVolumes: DailyVolume[]
  slotVolumes: SlotVolume[]
  cycleTime: CycleTimeBaseline | null
  tmsSessions: ExerciseTmsSession[]
  cycleTimeChart: CycleTimeChartView
  scenarios: Scenario[]
  stubRuns: Array<StubRun & { scenarioId: string }>
  submitted: SubmittedDetails | null
}

const emptyTeamSetup = (): TeamSetup => ({
  agentsLt6m: null,
  agents6To24m: null,
  agents24To48m: null,
  agentsGt48m: null,
  deliveryHc: null,
  workingHoursPerDay: null,
  paidLeaveDays: null,
  otherLeaveDays: null,
  weekendCode: null,
  availabilityRatio: null,
  automationRatio: null,
  capacityRatio: null,
  maxOvertimeMinutes: null,
  slaType: null,
  slaTargetRatio: null,
  slaTurnaroundMinutes: null,
  slaStartTime: null,
  slaEndTime: null,
  slaWeekendEnabled: null,
  weekendShiftHc: null,
  skeletonRatio: null,
  totalAgents: null,
  averageTenureYears: null,
  maxCapacityDays: null,
  workingDaysPerYear: null,
  dailyCapacityPerAgent: null,
  version: 0,
})

export function seedTrainVolumes(exercise: Exercise, shell: ExerciseShell) {
  const cutoffMonth = exercise.sizingMonth
  shell.monthlyVolumes = shell.monthlyVolumes
    .filter((row) => !cutoffMonth || row.month <= cutoffMonth)
    .sort((a, b) => a.month.localeCompare(b.month))

  const dates = dailyTrainDates(exercise.sizingMonth)
  const lastDate = dates[dates.length - 1]
  shell.dailyVolumes = shell.dailyVolumes
    .filter((row) => !lastDate || row.volumeDate <= lastDate)
    .sort((a, b) => a.volumeDate.localeCompare(b.volumeDate))

  const slots = slotTrainKeys(exercise.slotStartDate, exercise.slotWeeks)
  const slotMap = new Map(
    shell.slotVolumes.map((row) => [`${row.slotStartAt}|${row.slotEndAt}`, row]),
  )
  shell.slotVolumes = slots.map(({ slotStartAt, slotEndAt }) => {
    const prior = slotMap.get(`${slotStartAt}|${slotEndAt}`)
    return {
      id: prior?.id ?? crypto.randomUUID(),
      slotStartAt,
      slotEndAt,
      actualVolume: prior?.actualVolume ?? 0,
      sourceType: prior?.sourceType ?? 'MANUAL',
      importBatchId: prior?.importBatchId ?? null,
    }
  })
}

function demoTms(): Pick<ExerciseShell, 'cycleTime' | 'tmsSessions' | 'cycleTimeChart'> {
  const tmsSessions: ExerciseTmsSession[] = [
    {
      sessionNo: 'TMS-1001',
      reference: 'BKG-1001',
      agentName: 'Demo Agent',
      toolkitName: 'Booking Amendments',
      subtaskName: 'Booking amendment',
      processedVolume: 2,
      netDurationSeconds: 280,
      remarks: 'Demo import',
      cycleTimeSeconds: 140,
      zScore: 0.21,
      included: true,
      exclusionReason: null,
      startedAt: '2026-05-04T09:12:00Z',
      endedAt: '2026-05-04T09:16:40Z',
    },
    {
      sessionNo: 'TMS-1002',
      reference: 'BKG-1002',
      agentName: 'Demo Agent',
      toolkitName: 'Booking Amendments',
      subtaskName: 'Booking amendment',
      processedVolume: 1,
      netDurationSeconds: 145,
      remarks: '',
      cycleTimeSeconds: 145,
      zScore: 0.48,
      included: true,
      exclusionReason: null,
      startedAt: '2026-05-05T10:04:00Z',
      endedAt: '2026-05-05T10:06:25Z',
    },
    {
      sessionNo: 'TMS-1003',
      reference: 'BKG-1003',
      agentName: 'Demo Agent',
      toolkitName: 'Booking Amendments',
      subtaskName: 'Booking amendment',
      processedVolume: 2,
      netDurationSeconds: 284,
      remarks: '',
      cycleTimeSeconds: 142,
      zScore: 0.32,
      included: true,
      exclusionReason: null,
      startedAt: '2026-05-06T11:20:00Z',
      endedAt: '2026-05-06T11:24:44Z',
    },
  ]
  return {
    tmsSessions,
    cycleTime: {
      id: crypto.randomUUID(),
      baselineType: 'SYSTEM',
      medianSeconds: 142,
      sampleCount: tmsSessions.length,
      calculationMethod: 'MEDIAN',
      manualReason: null,
      active: true,
      calculatedAt: '2026-05-06T12:00:00Z',
      files: [],
    },
    cycleTimeChart: {
      points: [
        { date: '2026-05-04', dailyMedianSeconds: 140, rollingMedianSeconds: 140, outlier: false },
        { date: '2026-05-05', dailyMedianSeconds: 145, rollingMedianSeconds: 142.5, outlier: false },
        { date: '2026-05-06', dailyMedianSeconds: 142, rollingMedianSeconds: 142, outlier: false },
      ],
      upperControlLimitSeconds: 148,
      lowerControlLimitSeconds: 136,
      sampleCount: tmsSessions.length,
    },
  }
}

export function createExerciseShell(): ExerciseShell {
  return {
    teamSetup: {
      ...emptyTeamSetup(),
      slaType: 'BUSINESS_HOURS',
      slaTargetRatio: 0.9,
      slaTurnaroundMinutes: 480,
      slaStartTime: '09:00:00',
      slaEndTime: '18:00:00',
      weekendCode: '1',
    },
    support: [],
    calendar: {
      holidays: [
        {
          id: crypto.randomUUID(),
          holidayDate: '2025-01-01',
          holidayName: "New Year's Day",
          holidayType: 'HOLIDAY',
        },
        {
          id: crypto.randomUUID(),
          holidayDate: '2025-10-01',
          holidayName: 'National Day',
          holidayType: 'HOLIDAY',
        },
      ],
    },
    monthlyVolumes: [],
    dailyVolumes: [],
    slotVolumes: [],
    ...demoTms(),
    scenarios: [],
    stubRuns: [],
    submitted: null,
  }
}

/** In-memory Associated Data / Scenario / Submit state keyed by exercise id. */
export const exerciseShells = new Map<string, ExerciseShell>()

export function ensureShell(exercise: Exercise): ExerciseShell {
  let shell = exerciseShells.get(exercise.id)
  if (!shell) {
    shell = createExerciseShell()
    seedTrainVolumes(exercise, shell)
    exerciseShells.set(exercise.id, shell)
  }
  return shell
}

function workingHoursFromSlaClock(start: string | null | undefined, end: string | null | undefined) {
  const parse = (value: string | null | undefined) => {
    const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value ?? '').trim())
    if (!match) return null
    const hours = Number(match[1])
    const minutes = Number(match[2])
    const seconds = Number(match[3] ?? 0)
    if (hours > 23 || minutes > 59 || seconds > 59) return null
    return hours * 3600 + minutes * 60 + seconds
  }
  const startSec = parse(start)
  const endSec = parse(end)
  if (startSec == null || endSec == null) return null
  let seconds = endSec - startSec
  if (seconds <= 0) seconds += 24 * 3600
  return Math.round((seconds / 3600) * 1_000_000) / 1_000_000
}

/** GET-shaped Team Setup: inputs plus metrics computed from Calendar / Shared KPI / Cycle Time. */
export function teamSetupView(exercise: Exercise, shell: ExerciseShell): TeamSetup {
  const setup = shell.teamSetup
  const a = Number(setup.agentsLt6m ?? 0)
  const b = Number(setup.agents6To24m ?? 0)
  const c = Number(setup.agents24To48m ?? 0)
  const d = Number(setup.agentsGt48m ?? 0)
  const total = a + b + c + d
  const weekend = setup.weekendCode
  const year = Number(String(exercise.sizingMonth ?? '').slice(0, 4))
  const workingDays = Number.isFinite(year)
    ? computeNetworkDays(year, weekend, [])
    : null
  const hours = workingHoursFromSlaClock(setup.slaStartTime, setup.slaEndTime)
  const availability = setup.availabilityRatio
  const cycleTime = shell.cycleTime?.medianSeconds != null ? Number(shell.cycleTime.medianSeconds) : null
  const maxCapacity =
    workingDays != null
      ? workingDays - Number(setup.paidLeaveDays ?? 0) - Number(setup.otherLeaveDays ?? 0)
      : null
  const capacityRatio =
    workingDays != null && workingDays > 0 && maxCapacity != null
      ? Math.round((maxCapacity / workingDays) * 1e8) / 1e8
      : null
  const dailyCapacity =
    hours != null && availability != null && cycleTime != null && cycleTime > 0
      ? Math.round(((hours * availability * 3600) / cycleTime) * 1e6) / 1e6
      : null
  const deliveryHc = exercise.snapshot.sharedKpis.reduce((sum, item) => sum + Number(item.deliveryHc), 0)
  return {
    ...setup,
    deliveryHc,
    weekendCode: weekend ?? null,
    workingHoursPerDay: hours,
    capacityRatio,
    totalAgents: total || null,
    averageTenureYears: total ? (a * 3 + b * 15 + c * 36 + d * 48) / 12 / total : null,
    workingDaysPerYear: workingDays,
    maxCapacityDays: maxCapacity,
    dailyCapacityPerAgent: dailyCapacity,
  }
}
