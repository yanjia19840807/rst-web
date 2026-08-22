import type { Shift, ShiftRequest } from './associatedData'

export type ScenarioStatus = 'DRAFT'

export interface Scenario {
  id: string
  scenarioCode: string
  name: string
  description: string | null
  status: ScenarioStatus | string
  rightSizingHc: number | null
  version: number
  shifts: Shift[]
}

export interface CreateScenarioRequest {
  scenarioCode: string
  name: string
  description?: string | null
  rightSizingHc?: number | null
}

export interface UpdateScenarioRequest {
  name: string
  description?: string | null
  rightSizingHc?: number | null
}

export interface StubRun {
  id: string
  runType: string
  status: string
  runNo: number
}

export interface ForecastPointView {
  id: string
  periodStart: string
  periodEnd: string
  forecastMean: number
  lowerBound: number | null
  upperBound: number | null
  acceptedValue: number | null
}

export interface ForecastView {
  id: string
  runNo: number
  method: string
  methodVersion: string
  status: string
  forecastLevel?: string
  trainingFrom: string
  trainingTo: string
  featureMetadata: string | null
  inputHash?: string
  startedAt: string
  completedAt: string | null
  points: ForecastPointView[]
}

/** Frozen training actual used by the official forecast (written on APPROVED). */
export interface ForecastTrainingObservation {
  grain: string
  periodStart: string
  actualVolume: number
  source: string
  sourceExerciseId: string | null
}

export interface ForecastTrainingBundle {
  monthly: ForecastTrainingObservation[]
  daily: ForecastTrainingObservation[]
}

export interface ForecastBundle {
  monthly: ForecastView
  daily: ForecastView
}

export interface SizingPreviewBundle {
  forecast: ForecastBundle
  monthly: MonthlySizingView
  daily: DailySizingView
}

export interface CommitScenarioResults {
  forecast: ForecastBundle
  monthly: MonthlySizingView
  daily: DailySizingView
  slot?: SlotSimulationView | null
}

export interface CommitScenarioRequest {
  name: string
  description?: string | null
  rightSizingHc?: number | null
  shifts: ShiftRequest[]
  results?: CommitScenarioResults | null
}

export interface MonthlySizingRowView {
  id: string
  month: string
  forecastVolume: number
  manualVolume: number
  workdays: number
  weekendDays: number
  cycleTimeSeconds: number
  nominalHcWithoutOt: number
  nominalHcWithOt: number
  productionSupportFte: number
  rightSizingHc: number
  capacityCreation: number
}

export interface MonthlySizingView {
  id: string
  runNo: number
  status: string
  calculationVersion: string
  forecastRunId: string | null
  startedAt: string
  completedAt: string | null
  rows: MonthlySizingRowView[]
}

export interface DailySizingRowView {
  id: string
  resultDate: string
  forecastVolume: number
  manualVolume: number
  holiday: boolean
  workingDay: boolean
  simulationHc: number
  standardCapacity: number
  overtimeCapacity: number
  backlogStart: number
  backlogEnd: number
}

export interface DailySizingView {
  id: string
  runNo: number
  status: string
  calculationVersion: string
  forecastRunId: string | null
  startedAt: string
  completedAt: string | null
  rows: DailySizingRowView[]
}

export interface SlotRowView {
  id: string
  slotStartAt: string
  slotEndAt: string
  rawVolume: number
  manualVolume: number
  theoreticalFte: number
  shiftFte: number
  casesPerFte: number
  teamCapacity: number
  backlogStart: number
  backlogEnd: number
  volumeOutsideSla: number
  tatResult: number
  slaResult: number
}

export interface SlotChartView {
  labels: string[]
  theoreticalFte: number[]
  shiftFteByKey: Record<string, number[]>
  cumulativeTat: number[]
}

export interface SlotSimulationView {
  id: string
  runNo: number
  status: string
  calculationVersion: string
  forecastRunId: string | null
  startedAt: string
  completedAt: string | null
  tatOnPeriod: number
  actualVsTheoretical: number
  shiftCount: number
  applicability: boolean
  slaTargetRatio: number | null
  rows: SlotRowView[]
  chart: SlotChartView
}
