import type {
  ApprovalHistoryRow,
  ApprovalWorkspaceView,
} from '@/features/approval/types'
import type { SubmittedDetails, WorkflowActionView } from '@/features/exercise-management/types'

const OPEN = new Set(['OPEN', 'AWAITING'])

function reviewStage(role?: string | null) {
  switch (role) {
    case 'MANAGER':
      return 'Manager Review'
    case 'CDH':
      return 'Center Delivery Head Review'
    case 'LTH':
      return 'Local Transformation Head Review'
    default:
      return role || null
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
      return role || null
  }
}

function isSubmit(action: WorkflowActionView) {
  return action.actionType === 'APPROVED'
    && (action.actorRoleCode === 'SUPERVISOR' || (action.stepNo ?? 0) === 0)
}

function historyStep(action: WorkflowActionView) {
  if (isSubmit(action) || action.actionType === 'WITHDRAWN') {
    return 'Supervisor Workbench'
  }
  const stepNo = action.stepNo ?? 0
  if (stepNo === 1) return reviewStage('MANAGER') ?? 'Manager Review'
  if (stepNo === 2) return reviewStage('CDH') ?? 'Center Delivery Head Review'
  if (stepNo === 3) return reviewStage('LTH') ?? 'Local Transformation Head Review'
  return reviewStage(action.actorRoleCode) ?? 'Review'
}

function historyDecision(action: WorkflowActionView) {
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

function readyRole(submitted: SubmittedDetails) {
  return submitted.steps.find((step) => step.routingStatus === 'PENDING')?.requiredRoleCode
    ?? submitted.requiredRole
    ?? null
}

function waiting(submitted: SubmittedDetails) {
  const ready = submitted.steps.find((step) => step.routingStatus === 'PENDING')
  const role = readyRole(submitted)
  return {
    step: OPEN.has(submitted.submissionStatus) ? reviewStage(role) : null,
    reviewer: ready?.assigneeDisplayName ?? null,
    role,
  }
}

function historyRows(submitted: SubmittedDetails, mineStepNo?: number | null): ApprovalHistoryRow[] {
  return [...submitted.actions]
    .sort((a, b) => {
      const byTime = new Date(a.actionAt ?? 0).getTime() - new Date(b.actionAt ?? 0).getTime()
      if (byTime !== 0) return byTime
      return (a.stepNo ?? 0) - (b.stepNo ?? 0)
    })
    .flatMap((action) => {
      const decision = historyDecision(action)
      if (!decision) return []
      const mine =
        mineStepNo != null
        && action.stepNo === mineStepNo
        && !isSubmit(action)
        && (action.actionType === 'APPROVED'
          || action.actionType === 'RETURNED'
          || action.actionType === 'REJECTED')
      return [
        {
          actionId: action.requestId || `${action.stepNo}-${action.actionAt}`,
          stepNo: action.stepNo ?? 0,
          step: historyStep(action),
          role: roleLabel(action.actorRoleCode) ?? '—',
          actor: action.actorDisplayName ?? null,
          decision,
          comments: action.comments ?? null,
          completedAt: action.actionAt ?? submitted.submittedAt,
          mine,
        },
      ]
    })
}

function nextFor(role?: string | null) {
  if (role === 'MANAGER') {
    return {
      step: 'Center Delivery Head Review',
      positionId: null as string | null,
      reviewer: null as string | null,
      handlerCcgid: null as string | null,
    }
  }
  if (role === 'CDH') {
    return {
      step: 'Local Transformation Head Review',
      positionId: 'LTH',
      reviewer: null,
      handlerCcgid: null,
    }
  }
  if (role === 'LTH') {
    return { step: 'Archive', positionId: null, reviewer: null, handlerCcgid: null }
  }
  return { step: null, positionId: null, reviewer: null, handlerCcgid: null }
}

export function buildApprovalWorkspace(
  submitted: SubmittedDetails,
  options: { inProgress: boolean; mineStepNo?: number | null },
): ApprovalWorkspaceView {
  const hop = waiting(submitted)
  const history = historyRows(submitted, options.inProgress ? null : options.mineStepNo)
  if (options.inProgress) {
    const next = nextFor(hop.role)
    return {
      mode: 'IN_PROGRESS',
      statusBar: {
        state: 'IN_PROGRESS',
        label: 'In progress',
        step: hop.step,
        reviewer: hop.reviewer,
      },
      currentHop: { step: hop.step, reviewer: hop.reviewer },
      nextStep: next.step,
      nextPositionId: next.positionId,
      nextReviewer: next.reviewer,
      nextHandlerCcgid: next.handlerCcgid,
      history,
    }
  }
  const closed =
    submitted.submissionStatus === 'APPROVED'
      ? { state: 'APPROVED', label: 'Approved' }
      : submitted.submissionStatus === 'RETURNED'
        ? { state: 'RETURNED', label: 'Returned' }
        : submitted.submissionStatus === 'REJECTED'
          ? { state: 'REJECTED', label: 'Rejected' }
          : submitted.submissionStatus === 'WITHDRAWN'
            ? { state: 'WITHDRAWN', label: 'Withdrawn' }
            : null
  return {
    mode: 'COMPLETED',
    statusBar: closed
      ? { state: closed.state, label: closed.label, step: null, reviewer: null }
      : { state: 'NOW', label: 'Now', step: hop.step, reviewer: hop.reviewer },
    currentHop: null,
    nextStep: null,
    nextPositionId: null,
    nextReviewer: null,
    nextHandlerCcgid: null,
    history,
  }
}
