import type {
  CalendarView,
  CycleTimeBaseline,
  DailyVolume,
  Exercise,
  MonthlyVolume,
  Scenario,
  Shift,
  SlotVolume,
  StubRun,
  SubmittedDetails,
  SupportItem,
  TeamSetup,
} from '@/features/exercise-management/types'

export type ExerciseShell = {
  teamSetup: TeamSetup
  shifts: Shift[]
  support: SupportItem[]
  calendar: CalendarView
  monthlyVolumes: MonthlyVolume[]
  dailyVolumes: DailyVolume[]
  slotVolumes: SlotVolume[]
  cycleTime: CycleTimeBaseline | null
  scenarios: Scenario[]
  stubRuns: Array<StubRun & { scenarioId: string }>
  officialPackageId: string | null
  packageVersion: number
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
  calculationVersion: 'v1',
  version: 0,
})

export function createExerciseShell(deliveryHc = 0): ExerciseShell {
  return {
    teamSetup: {
      ...emptyTeamSetup(),
      deliveryHc,
      workingHoursPerDay: 8,
      slaType: 'BUSINESS_HOURS',
      slaTargetRatio: 0.9,
      slaTurnaroundMinutes: 480,
      weekendCode: 'SAT_SUN',
    },
    shifts: [
      {
        id: crypto.randomUUID(),
        shiftNo: 1,
        startTime: '09:00:00',
        durationMinutes: 540,
        headcount: deliveryHc || 1,
        worksOnWeekend: false,
      },
    ],
    support: [],
    calendar: {
      weekendCode: 'SAT_SUN',
      baselineSource: 'CENTER_TEMPLATE',
      baselineVersion: '1',
      sourceTemplateId: '10000000-0000-0000-0000-000000000001',
      sourceTemplateVersion: 1,
      baselineYear: 2025,
      workingDaysPerYear: 243,
      version: 0,
      templateUpdateAvailable: false,
      publishedTemplateVersion: null,
      templateUpdateMessage: null,
      holidays: [
        {
          id: crypto.randomUUID(),
          holidayDate: '2025-01-01',
          holidayName: "New Year's Day",
          holidayType: 'BASELINE',
          workingDayOverride: null,
        },
        {
          id: crypto.randomUUID(),
          holidayDate: '2025-10-01',
          holidayName: 'National Day',
          holidayType: 'BASELINE',
          workingDayOverride: null,
        },
      ],
    },
    monthlyVolumes: [],
    dailyVolumes: [],
    slotVolumes: [],
    cycleTime: null,
    scenarios: [],
    stubRuns: [],
    officialPackageId: null,
    packageVersion: 0,
    submitted: null,
  }
}

/** In-memory Associated Data / Scenario / Submit state keyed by exercise id. */
export const exerciseShells = new Map<string, ExerciseShell>()

export function ensureShell(exercise: Exercise): ExerciseShell {
  let shell = exerciseShells.get(exercise.id)
  if (!shell) {
    const deliveryHc = exercise.snapshot.sharedKpis.reduce((sum, item) => sum + item.deliveryHc, 0)
    shell = createExerciseShell(deliveryHc)
    exerciseShells.set(exercise.id, shell)
  }
  return shell
}

export function recomputeTeamSetup(setup: TeamSetup): TeamSetup {
  const a = Number(setup.agentsLt6m ?? 0)
  const b = Number(setup.agents6To24m ?? 0)
  const c = Number(setup.agents24To48m ?? 0)
  const d = Number(setup.agentsGt48m ?? 0)
  const total = a + b + c + d
  const leave = Number(setup.paidLeaveDays ?? 0) + Number(setup.otherLeaveDays ?? 0)
  const workingDays = Math.max(0, 260 - leave)
  const hours = Number(setup.workingHoursPerDay ?? 8)
  const availability = Number(setup.availabilityRatio ?? 1)
  return {
    ...setup,
    totalAgents: total || null,
    averageTenureYears: total
      ? (a * 0.25 + b * 1.25 + c * 3 + d * 5) / total
      : null,
    workingDaysPerYear: workingDays || null,
    dailyCapacityPerAgent: hours * availability || null,
    version: setup.version + 1,
  }
}
