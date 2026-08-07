import type { SupervisorToolkit, ToolkitSubtask } from '@/features/toolkit-management/types'

export type WorkflowStatus =
  | 'IN_PROGRESS'
  | 'UNDER_REVIEW'
  | 'RETURNED'
  | 'VALIDATED'
  | 'ARCHIVED'

export type ScenarioStatus = 'DRAFT' | 'OFFICIAL'

export interface ExerciseKpiLine {
  id: string
  sourceSelectionId: string | null
  carrier: string
  site: string
  customerCountry: string
  deliveryHc: number
  valid: boolean
}

export interface ExerciseSubtask {
  id: string
  sourceToolkitSubtaskId: string | null
  name: string
  description: string | null
  displayOrder: number
  deletedAt: string | null
}

export interface Exercise {
  id: string
  exerciseCode: string
  toolkitId: string
  sizingMonth: string
  slotStartDate: string
  slotWeeks: number
  tmsFrom: string
  tmsTo: string
  workflowStatus: WorkflowStatus
  officialScenarioId: string | null
  submittedAt: string | null
  canDelete: boolean
  canSubmit: boolean
  canEdit: boolean
  version: number
  createdAt: string
  snapshot: {
    toolkit: Pick<
      SupervisorToolkit,
      | 'id'
      | 'name'
      | 'center'
      | 'domain'
      | 'pl1'
      | 'pl2'
      | 'pl3Code'
      | 'pl3Name'
      | 'combineSubtasksTime'
      | 'version'
    >
    subtasks: ExerciseSubtask[] | ToolkitSubtask[]
    sharedKpis: ExerciseKpiLine[]
    timesheetSyncDate: string
  }
}

export interface CreateExerciseInput {
  toolkitId: string
  sizingMonth: string
  slotStartDate: string
  slotWeeks: number
  tmsFrom: string
  tmsTo: string
}

export interface TeamSetup {
  agentsLt6m: number | null
  agents6To24m: number | null
  agents24To48m: number | null
  agentsGt48m: number | null
  deliveryHc: number | null
  workingHoursPerDay: number | null
  paidLeaveDays: number | null
  otherLeaveDays: number | null
  weekendCode: string | null
  availabilityRatio: number | null
  automationRatio: number | null
  capacityRatio: number | null
  maxOvertimeMinutes: number | null
  slaType: string | null
  slaTargetRatio: number | null
  slaTurnaroundMinutes: number | null
  slaStartTime: string | null
  slaEndTime: string | null
  slaWeekendEnabled: boolean | null
  weekendShiftHc: number | null
  skeletonRatio: number | null
  totalAgents: number | null
  averageTenureYears: number | null
  workingDaysPerYear: number | null
  dailyCapacityPerAgent: number | null
  calculationVersion: string | null
  version: number
}

export type TeamSetupRequest = Omit<
  TeamSetup,
  | 'totalAgents'
  | 'averageTenureYears'
  | 'workingDaysPerYear'
  | 'dailyCapacityPerAgent'
  | 'calculationVersion'
  | 'version'
>

export interface Shift {
  id: string
  shiftNo: number
  startTime: string
  durationMinutes: number
  headcount: number
  worksOnWeekend: boolean
}

export interface ShiftRequest {
  shiftNo: number
  startTime: string
  durationMinutes: number
  headcount: number
  worksOnWeekend: boolean
}

export interface SupportScope {
  exerciseSharedKpiLineId: string
  allocationRatio: number
}

export interface SupportItem {
  id: string
  lineageId: string
  category: string
  activity: string
  frequencyCode: string
  volume: number
  unitOfMeasure: string
  workloadPerUnitMinutes: number
  annualMultiplier: number
  workloadPerYearHours: number | null
  supportFte: number | null
  comments: string | null
  calculationVersion: string | null
  scopes: SupportScope[]
}

export interface SupportItemRequest {
  category: string
  activity: string
  frequencyCode: string
  volume: number
  unitOfMeasure: string
  workloadPerUnitMinutes: number
  annualMultiplier: number
  comments?: string | null
  kpiLineIds?: string[]
}

export interface Holiday {
  id: string
  holidayDate: string
  holidayName: string
  holidayType: string
  workingDayOverride: boolean | null
}

export interface HolidayRequest {
  holidayDate: string
  holidayName: string
  holidayType: string
  workingDayOverride?: boolean | null
}

export interface CalendarView {
  countryCode: string | null
  timezone: string | null
  weekendCode: string | null
  baselineSource: string | null
  baselineVersion: string | null
  version: number
  holidays: Holiday[]
}

export interface CalendarRequest {
  countryCode?: string | null
  timezone?: string | null
  weekendCode?: string | null
  baselineSource?: string | null
  baselineVersion?: string | null
  holidays?: HolidayRequest[]
}

export interface MonthlyVolume {
  id: string
  month: string
  actualVolume: number | null
  commercialRatio: number | null
  manualForecastVolume: number | null
  sourceType: string | null
}

export interface MonthlyVolumeRequest {
  month: string
  actualVolume?: number | null
  commercialRatio?: number | null
  manualForecastVolume?: number | null
}

export interface DailyVolume {
  id: string
  volumeDate: string
  actualVolume: number | null
  dailyAdjustmentRatio: number | null
  manualForecastVolume: number | null
  sourceType: string | null
}

export interface DailyVolumeRequest {
  volumeDate: string
  actualVolume?: number | null
  dailyAdjustmentRatio?: number | null
  manualForecastVolume?: number | null
}

export interface SlotVolume {
  id: string
  slotStartAt: string
  slotEndAt: string
  rawVolume: number
  timezone: string
  sourceType: string | null
}

export interface SlotVolumeRequest {
  slotStartAt: string
  slotEndAt: string
  rawVolume: number
  timezone: string
}

export interface CycleTimeBaseline {
  id: string
  baselineType: string
  medianSeconds: number
  sampleCount: number | null
  coverageRatio: number | null
  calculationMethod: string | null
  methodVersion: string | null
  manualReason: string | null
  active: boolean
  calculatedAt: string
}

export interface ManualBaselineRequest {
  medianSeconds: number
  manualReason: string
}

export interface Assumption {
  id: string
  parameterCode: string
  numericValue: number | null
  textValue: string | null
  booleanValue: boolean | null
  unit: string | null
}

export interface AssumptionRequest {
  parameterCode: string
  numericValue?: number | null
  textValue?: string | null
  booleanValue?: boolean | null
  unit?: string | null
}

export interface Scenario {
  id: string
  scenarioCode: string
  name: string
  description: string | null
  status: ScenarioStatus | string
  officialAt: string | null
  version: number
  assumptions: Assumption[]
}

export interface CreateScenarioRequest {
  scenarioCode: string
  name: string
  description?: string | null
  assumptions?: AssumptionRequest[]
}

export interface UpdateScenarioRequest {
  name: string
  description?: string | null
  assumptions?: AssumptionRequest[]
}

export interface StubRun {
  id: string
  runType: string
  status: string
  runNo: number
}

export interface ValidationFinding {
  ruleCode: string
  severity: string
  passed: boolean
  remarks: string | null
}

export interface SubmitPreview {
  officialPackageId: string
  findings: ValidationFinding[]
  remarksRequired: boolean
}

export interface SubmitRequest {
  remarks?: string | null
  requestId?: string | null
}

export interface SubmissionScope {
  scopeLevel: string
  center: string
  site: string
  domain: string
  pl3Code: string
  carrier: string
  customerCountry: string
}

export interface WorkflowStepView {
  stepNo: number
  requiredRoleCode: string
  assigneeUserId: string | null
  routingStatus: string
}

export interface WorkflowActionView {
  stepNo?: number
  actionType: string
  actorUserId?: string | null
  actorRoleCode?: string | null
  comments?: string | null
  actionAt?: string | null
  requestId: string | null
}

export interface SubmittedDetails {
  exerciseId: string
  exerciseCode: string
  workflowStatus: string
  submittedAt: string
  officialPackageId: string
  packageVersion: number
  packageStatus?: string
  scenarioId: string
  scenarioName: string | null
  submissionId: string
  submissionCode: string
  submissionStatus: string
  currentStep: number | null
  remarks: string | null
  scopes: SubmissionScope[]
  workflowInstanceId: string
  workflowStatusLabel: string
  steps: WorkflowStepView[]
  actions: WorkflowActionView[]
}
