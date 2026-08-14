/** Approval role → review-stage label. */
export function nextStepLabel(role?: string | null): string {
  switch (role) {
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

/** Supervisor list / detail status label. Under review shows the current stage. */
export function exerciseStatusLabel(exercise: {
  workflowStatus: string
  requiredRole?: string | null
}): string {
  switch (exercise.workflowStatus) {
    case 'UNDER_REVIEW':
      return nextStepLabel(exercise.requiredRole)
    case 'RETURNED':
      return 'Returned'
    case 'VALIDATED':
      return 'Approved'
    case 'ARCHIVED':
      return 'Rejected'
    default:
      return 'In Progress'
  }
}
