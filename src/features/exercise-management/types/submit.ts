import type { ApprovalWorkspaceView } from '@/features/approval/types'

/** Approval/types is the source of truth for workflow step/action shapes. */
export type {
  ActionView as WorkflowActionView,
  StepView as WorkflowStepView,
} from '@/features/approval/types'

import type { TimesheetAlignmentView } from '@/features/timesheet-alignment/types'
import type { ActionView, ScopeView, StepView } from '@/features/approval/types'

export interface MonthMismatch {
  month: string
  daily: string
  monthly: string
}

export interface ValidationDetail {
  reason: string
  comparedMonths: number
  mismatches: MonthMismatch[]
}

export type ValidationRuleCode = 'DAILY_VS_MONTHLY'
export type ValidationSeverity = 'OK' | 'WARNING' | 'SEVERE'

/** Failure grade is fixed per rule, same as the API ValidationRule enum. */
export const VALIDATION_RULES: Record<ValidationRuleCode, { severity: ValidationSeverity }> = {
  DAILY_VS_MONTHLY: { severity: 'WARNING' },
}

export interface ValidationFinding {
  ruleCode: ValidationRuleCode
  severity: ValidationSeverity
  detail: ValidationDetail | null
}

export interface SubmitPreview {
  scenarioId: string
  findings: ValidationFinding[]
  remarksRequired: boolean
  submitBlocked: boolean
  timesheetAlignment?: TimesheetAlignmentView | null
  scopeAcknowledgementRequired?: boolean
}

export interface SubmitRequest {
  remarks?: string | null
  requestId?: string | null
  scopeAcknowledged?: boolean | null
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
