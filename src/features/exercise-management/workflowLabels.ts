/** Lifecycle bucket (not a step). Matches the In Progress list tab. */
export const IN_PROGRESS_TAB = 'In Progress' as const

export const SUPERVISOR_SIZING_STEP = 'Supervisor Sizing'

export const CURRENT_STEP_FILTERS = [
  'All stages',
  SUPERVISOR_SIZING_STEP,
  'Manager Review',
  'Center Delivery Head Review',
  'Local Transformation Head Review',
] as const

export type CurrentStepFilter = (typeof CURRENT_STEP_FILTERS)[number]

/** Approval role → review-stage label. */
export function nextStepLabel(role?: string | null): string {
  switch (role) {
    case 'SUPERVISOR':
      return SUPERVISOR_SIZING_STEP
    case 'MANAGER':
      return 'Manager Review'
    case 'CDH':
      return 'Center Delivery Head Review'
    case 'LTH':
      return 'Local Transformation Head Review'
    default:
      return role || '—'
  }
}

/**
 * Current step for list / detail.
 * Return and Withdraw are actions, not steps — both land on Supervisor Sizing.
 */
export function currentStepLabel(exercise: {
  workflowStatus: string
  requiredRole?: string | null
}): string {
  switch (exercise.workflowStatus) {
    case 'UNDER_REVIEW':
      return nextStepLabel(exercise.requiredRole)
    case 'APPROVED':
      return 'Approved'
    case 'REJECTED':
      return 'Rejected'
    default:
      return SUPERVISOR_SIZING_STEP
  }
}

export function isReturned(exercise: { workflowStatus: string }): boolean {
  return exercise.workflowStatus === 'RETURNED'
}

/** Maps the Current Step filter label to the list API `reviewStage` value. */
export function reviewStageQueryValue(label: CurrentStepFilter): string | undefined {
  switch (label) {
    case SUPERVISOR_SIZING_STEP:
      return 'SUPERVISOR'
    case 'Manager Review':
      return 'MANAGER'
    case 'Center Delivery Head Review':
      return 'CDH'
    case 'Local Transformation Head Review':
      return 'LTH'
    default:
      return undefined
  }
}
