import type { ApprovalHistoryRow } from '@/features/approval/types'
import type { WorkflowActionView } from '@/features/exercise-management/types'

function reviewStage(role?: string | null) {
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

function roleLabel(role?: string | null) {
  switch (role) {
    case 'SUPERVISOR':
      return 'Supervisor'
    case 'MANAGER':
      return 'Manager'
    case 'CDH':
      return 'Center Delivery Head'
    case 'LTH':
      return 'Local Transformation Head'
    default:
      return role || '—'
  }
}

function isSubmit(action: WorkflowActionView) {
  return action.actionType === 'APPROVED'
    && (action.actorRoleCode === 'SUPERVISOR' || (action.stepNo ?? 0) === 0)
}

function isReviewerDecision(action: WorkflowActionView) {
  return !isSubmit(action)
    && (action.actionType === 'APPROVED'
      || action.actionType === 'RETURNED'
      || action.actionType === 'REJECTED')
}

function decision(action: WorkflowActionView) {
  if (isSubmit(action)) return 'Submitted'
  switch (action.actionType) {
    case 'APPROVED':
      return 'Approved'
    case 'RETURNED':
      return 'Returned'
    case 'REJECTED':
      return 'Rejected'
    case 'WITHDRAWN':
      return 'Withdrawn'
    default:
      return null
  }
}

function stepLabel(action: WorkflowActionView) {
  if (isSubmit(action) || action.actionType === 'WITHDRAWN') {
    return 'Supervisor Workbench'
  }
  const stepNo = action.stepNo ?? 0
  if (stepNo === 1) return reviewStage('MANAGER')
  if (stepNo === 2) return reviewStage('CDH')
  if (stepNo === 3) return reviewStage('LTH')
  return reviewStage(action.actorRoleCode)
}

/** Builds History rows from workflow actions when the workspace list is empty. */
export function historyFromActions(actions: WorkflowActionView[]): ApprovalHistoryRow[] {
  const sorted = [...actions].sort((a, b) => {
    const byTime = new Date(a.actionAt ?? 0).getTime() - new Date(b.actionAt ?? 0).getTime()
    if (byTime !== 0) return byTime
    return (a.stepNo ?? 0) - (b.stepNo ?? 0)
  })
  const lastDecision = [...sorted].reverse().find(isReviewerDecision)
  return sorted.flatMap((action) => {
    const label = decision(action)
    if (!label) return []
    return [
      {
        actionId: action.requestId || `${action.stepNo}-${action.actionAt}`,
        stepNo: action.stepNo ?? 0,
        step: stepLabel(action),
        role: roleLabel(action.actorRoleCode),
        actor: action.actorDisplayName ?? null,
        decision: label,
        comments: action.comments ?? null,
        completedAt: action.actionAt ?? '',
        mine:
          lastDecision != null
          && action.stepNo === lastDecision.stepNo
          && isReviewerDecision(action),
      },
    ]
  })
}
