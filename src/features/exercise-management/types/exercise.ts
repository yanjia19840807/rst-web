import type { SupervisorToolkit, ToolkitSubtask } from '@/features/toolkit-management/types'

import type { SlotVolume } from './associatedData'

export type WorkflowStatus =
  | 'IN_PROGRESS'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'

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
  slotStartDate: string | null
  slotWeeks: number | null
  tmsFrom: string
  tmsTo: string
  workflowStatus: WorkflowStatus
  submissionStatus?: string | null
  officialScenarioId: string | null
  submittedAt: string | null
  canDelete: boolean
  canSubmit: boolean
  canEdit: boolean
  version: number
  createdAt: string
  currentStep?: number | null
  requiredRole?: string | null
  currentReviewer?: string | null
  lastDecisionComment?: string | null
  deliveryHc?: number | string | null
  rightSizingHc?: number | string | null
  productionSupport?: number | string | null
  capacityCreation?: number | string | null
  agingDays?: number | null
  archivedAt?: string | null
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

export interface CommittedResultsStatus {
  scenarioCount: number
}

export interface ExerciseListQuery {
  tab?: 'IN_PROGRESS' | 'ARCHIVED'
  exerciseCode?: string
  toolkitName?: string
  pl3Name?: string
  workflowStatus?: string
  reviewStage?: string
  handler?: string
  officialScenario?: string
  createdFrom?: string
  createdTo?: string
  submittedFrom?: string
  submittedTo?: string
  archivedFrom?: string
  archivedTo?: string
  page?: number
  pageSize?: number
}

export interface ExerciseListView {
  items: Exercise[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  toolkitNames: string[]
  pl3Names: string[]
  reviewerNames: string[]
}

export interface CreateExerciseInput {
  toolkitId: string
  sizingMonth: string
  tmsFrom: string
  tmsTo: string
}

export interface CreateExerciseResult {
  exercise: Exercise
  notices: string[]
}

export interface UpdateExercisePeriodsInput {
  sizingMonth: string
  tmsFrom: string
  tmsTo: string
}

export interface UpdateSlotPeriodInput {
  slotStartDate: string
  slotWeeks: number
}

export interface UpdateSlotPeriodResult {
  exercise: Exercise
  volumes: SlotVolume[]
  notices: string[]
}

export interface UpdateExercisePeriodsResult {
  exercise: Exercise
  notices: string[]
}
