/** Lifecycle bucket (not a step). Matches the In Progress list tab. */
export const IN_PROGRESS_TAB = 'In Progress' as const

/** Finished list tab: LTH-approved Exercises. */
export const VALIDATED_TAB = 'Validated' as const

export const SUPERVISOR_SIZING_STEP = 'Supervisor Sizing'

export const CURRENT_STEP_FILTERS = [
  SUPERVISOR_SIZING_STEP,
  'Manager Review',
  'Center Delivery Head Review',
  'Local Transformation Head Review',
] as const

export type CurrentStepFilter = (typeof CURRENT_STEP_FILTERS)[number] | ''

/** Approval role → review-stage label. */
export function nextStepLabel(role?: string | null): string {
  switch (role) {
    case 'SUPERVISOR':
      return SUPERVISOR_SIZING_STEP
    case 'SR_MANAGER':
      return 'Manager Review'
    case 'DOMAIN_HEAD':
      return 'Center Delivery Head Review'
    case 'LOCAL_TRANSFORMATION_HEAD':
      return 'Local Transformation Head Review'
    default:
      return role || '—'
  }
}

/**
 * Current step for list / detail.
 * Return is an action, not a step — it lands on Supervisor Sizing.
 */
export function currentStepLabel(exercise: {
  workflowStatus: string
  requiredRole?: string | null
}): string {
  switch (exercise.workflowStatus) {
    case 'UNDER_REVIEW':
      return nextStepLabel(exercise.requiredRole)
    case 'APPROVED':
      return 'Validated'
    default:
      return SUPERVISOR_SIZING_STEP
  }
}

export function isReturned(exercise: {
  submissionStatus?: string | null
}): boolean {
  return exercise.submissionStatus === 'RETURNED'
}

/** Maps the Current Step filter label to the list API `reviewStage` value. */
export type ExerciseListTabQuery = 'IN_PROGRESS' | 'VALIDATED'

/**
 * Maps an Exercise {@code workflowStatus} to the list URL tab.
 * Do not use this to parse {@code ?tab=} — that query is already
 * {@code IN_PROGRESS} or {@code VALIDATED}.
 */
export function exerciseListTabQuery(status?: string | null): ExerciseListTabQuery {
  return status === 'APPROVED' ? 'VALIDATED' : 'IN_PROGRESS'
}

export function exerciseListLocation(status?: string | null) {
  return {
    name: 'supervisor-exercises' as const,
    query: { tab: exerciseListTabQuery(status) },
  }
}

export function exerciseListBackLabel(status?: string | null) {
  return exerciseListTabQuery(status) === 'VALIDATED'
    ? '← Back to Validated'
    : '← Back to In Progress'
}

export function reviewStageQueryValue(label: string): string | undefined {
  switch (label) {
    case SUPERVISOR_SIZING_STEP:
      return 'SUPERVISOR'
    case 'Manager Review':
      return 'SR_MANAGER'
    case 'Center Delivery Head Review':
      return 'DOMAIN_HEAD'
    case 'Local Transformation Head Review':
      return 'LOCAL_TRANSFORMATION_HEAD'
    default:
      return undefined
  }
}
