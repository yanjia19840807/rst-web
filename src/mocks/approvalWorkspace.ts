import type {
  ApprovalHistoryRow,
  ApprovalWorkspaceView,
} from '@/features/approval/types'
import type { SubmittedDetails, WorkflowActionView } from '@/features/exercise-management/types'

const OPEN = new Set(['AWAITING_MANAGER', 'AWAITING_CDH', 'AWAITING_LTH'])

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

function historyStep(action: WorkflowActionView) {
  if (action.actionType === 'SUBMIT') return 'Submit'
  if (action.actionType === 'WITHDRAW') return 'Withdraw'
  return reviewStage(action.actorRoleCode) ?? 'Review'
}

function historyDecision(type?: string | null) {
  switch (type) {
    case 'SUBMIT':
      return 'Submitted'
    case 'APPROVE':
      return 'Approved'
    case 'RETURN':
      return 'Returned'
    case 'WITHDRAW':
      return 'Withdrawn'
    default:
      return null
  }
}

function readyRole(submitted: SubmittedDetails) {
  return submitted.steps.find((step) => step.routingStatus === 'READY')?.requiredRoleCode
    ?? submitted.requiredRole
    ?? null
}

function waiting(submitted: SubmittedDetails) {
  const ready = submitted.steps.find((step) => step.routingStatus === 'READY')
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
      const decision = historyDecision(action.actionType)
      if (!decision) return []
      const mine =
        mineStepNo != null
        && action.stepNo === mineStepNo
        && (action.actionType === 'APPROVE' || action.actionType === 'RETURN')
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
  if (role === 'MANAGER') return { step: 'Center Delivery Head Review', reviewer: null as string | null }
  if (role === 'CDH') return { step: 'Local Transformation Head Review', reviewer: null }
  if (role === 'LTH') return { step: 'Archive', reviewer: null }
  return { step: null, reviewer: null }
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
      nextReviewer: next.reviewer,
      history,
    }
  }
  const closed =
    submitted.submissionStatus === 'VALIDATED'
      ? { state: 'ARCHIVED', label: 'Archived' }
      : submitted.submissionStatus === 'RETURNED'
        ? { state: 'RETURNED', label: 'Returned' }
        : submitted.submissionStatus === 'ARCHIVED'
          ? { state: 'WITHDRAWN', label: 'Withdrawn' }
          : null
  return {
    mode: 'COMPLETED',
    statusBar: closed
      ? { state: closed.state, label: closed.label, step: null, reviewer: null }
      : { state: 'NOW', label: 'Now', step: hop.step, reviewer: hop.reviewer },
    currentHop: null,
    nextStep: null,
    nextReviewer: null,
    history,
  }
}
