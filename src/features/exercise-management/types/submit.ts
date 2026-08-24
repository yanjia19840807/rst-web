import type { ApprovalWorkspaceView } from '@/features/approval/types'

/** Approval/types is the source of truth for workflow step/action shapes. */
export type {
  ActionView as WorkflowActionView,
  StepView as WorkflowStepView,
} from '@/features/approval/types'

import type { ActionView, ScopeView, StepView } from '@/features/approval/types'

export interface ValidationFinding {
  ruleCode: string
  severity: string
  passed: boolean
  remarks: string | null
}

export interface SubmitPreview {
  scenarioId: string
  findings: ValidationFinding[]
  remarksRequired: boolean
}

export interface SubmitRequest {
  remarks?: string | null
  requestId?: string | null
}

/** @deprecated Prefer ScopeView from approval/types; kept for existing exercise callers. */
export type SubmissionScope = ScopeView

export interface SubmittedDetails {
  exerciseId: string
  exerciseCode: string
  workflowStatus: string
  submittedAt: string
  scenarioId: string
  scenarioName: string | null
  submissionId: string
  submissionStatus: string
  currentStep: number | null
  requiredRole?: string | null
  remarks: string | null
  scopes: SubmissionScope[]
  steps: StepView[]
  actions: ActionView[]
  canDecide?: boolean
  workspace?: ApprovalWorkspaceView
}
