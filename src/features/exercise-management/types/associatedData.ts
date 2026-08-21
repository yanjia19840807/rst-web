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
  maxCapacityDays: number | null
  dailyCapacityPerAgent: number | null
  calculationVersion: string | null
  version: number
}

export type TeamSetupRequest = Omit<
  TeamSetup,
  | 'deliveryHc'
  | 'workingHoursPerDay'
  | 'capacityRatio'
  | 'totalAgents'
  | 'averageTenureYears'
  | 'workingDaysPerYear'
  | 'maxCapacityDays'
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

export interface SupportItem {
  id: string
  lineageId: string
  categoryId: string | null
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
}

export interface SupportItemRequest {
  categoryId: string
  activity: string
  frequencyCode: string
  volume: number
  unitOfMeasure: string
  workloadPerUnitMinutes: number
  /** Optional; server derives from Frequency (+ Working Days for Daily). */
  annualMultiplier?: number | null
  comments?: string | null
}

export interface Holiday {
  id: string
  holidayDate: string
  holidayName: string
  holidayType: string
}

export interface HolidayRequest {
  holidayDate: string
  holidayName: string
  holidayType: string
}

export interface CalendarView {
  holidays: Holiday[]
}

export interface CalendarRequest {
  holidays?: HolidayRequest[]
}

export interface MonthlyVolume {
  id: string
  month: string
  actualVolume: number | null
  commercialRatio: number | null
  sourceType: string | null
  importBatchId?: string | null
}

export interface MonthlyVolumeRequest {
  month: string
  actualVolume?: number | null
  commercialRatio?: number | null
}

export interface DailyVolume {
  id: string
  volumeDate: string
  actualVolume: number | null
  dailyAdjustmentRatio: number | null
  sourceType: string | null
  importBatchId?: string | null
}

export interface DailyVolumeRequest {
  volumeDate: string
  actualVolume?: number | null
  dailyAdjustmentRatio?: number | null
}

export interface SlotVolume {
  id: string
  slotStartAt: string
  slotEndAt: string
  actualVolume: number
  sourceType: string | null
  importBatchId?: string | null
}

export interface SlotVolumeRequest {
  slotStartAt: string
  slotEndAt: string
  actualVolume: number
}

export interface CycleTimeBaselineFile {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number | null
  webUrl: string
  displayOrder: number
}

export interface CycleTimeBaseline {
  id: string
  baselineType: string
  medianSeconds: number
  sampleCount: number | null
  calculationMethod: string | null
  manualReason: string | null
  active: boolean
  calculatedAt: string
  files?: CycleTimeBaselineFile[]
}

export interface ExerciseTmsSession {
  sessionNo: string
  reference: string
  agentName: string
  subtaskName: string
  processedVolume: number | null
  netDurationSeconds: number
  cycleTimeSeconds: number | null
  zScore: number | null
  included: boolean
  exclusionReason: string | null
  startedAt: string
  endedAt: string | null
}

export interface PatchExerciseTmsSessionResult {
  session: ExerciseTmsSession
  baseline: CycleTimeBaseline | null
}

export interface CycleTimeChartPoint {
  date: string
  dailyMedianSeconds: number
  rollingMedianSeconds: number
  outlier: boolean
}

export interface CycleTimeChartView {
  points: CycleTimeChartPoint[]
  upperControlLimitSeconds: number | null
  lowerControlLimitSeconds: number | null
  sampleCount: number
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ManualBaselineRequest {
  medianSeconds: number
  manualReason: string
  fileArtifactIds: string[]
}

/** Canonical Toolkit volume coverage (not this Exercise window). */
export interface ToolkitVolumeSummary {
  monthlyCount: number
  monthlyFrom: string | null
  monthlyTo: string | null
  dailyCount: number
  dailyFrom: string | null
  dailyTo: string | null
}

export interface ToolkitMonthlyPoint {
  month: string
  actualVolume: number
}

export interface ToolkitDailyPoint {
  volumeDate: string
  actualVolume: number
}

export interface ToolkitVolumePoints {
  monthly: ToolkitMonthlyPoint[]
  daily: ToolkitDailyPoint[]
}
