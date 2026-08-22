import { http, HttpResponse } from 'msw'

import type {
  ApprovalDetailView,
  ApprovalQueueItem,
  ApproveRequest,
  ReturnRequest,
} from '@/features/approval/types'
import type { Exercise, SubmittedDetails } from '@/features/exercise-management/types'

import { exercises } from '../data/supervisor'
import { ensureShell, exerciseShells } from '../data/exercise-store'
import { buildApprovalWorkspace } from '../approvalWorkspace'
import { pageOf, pageParams } from '../page'

/** Submission is open for review. Query status=AWAITING is accepted as an alias for OPEN. */
function isOpenStatus(status: string) {
  return status === 'OPEN' || status === 'AWAITING'
}

function problem(status: number, detail: string) {
  return HttpResponse.json({ title: 'Approval request failed', status, detail }, { status })
}

function syncFlags(exercise: Exercise) {
  const shell = ensureShell(exercise)
  exercise.officialScenarioId = exercise.officialScenarioId ?? shell.submitted?.scenarioId ?? null
  exercise.canEdit = exercise.workflowStatus === 'IN_PROGRESS' || exercise.workflowStatus === 'RETURNED'
  exercise.canDelete = exercise.canEdit && !exercise.submittedAt
  exercise.canSubmit = Boolean(exercise.officialScenarioId) && exercise.canEdit
}

function findBySubmission(submissionId: string | readonly string[] | undefined) {
  if (!submissionId || typeof submissionId !== 'string') return null
  for (const exercise of exercises) {
    const shell = exerciseShells.get(exercise.id) ?? ensureShell(exercise)
    if (shell.submitted?.submissionId === submissionId) {
      return { exercise, shell, submitted: shell.submitted }
    }
  }
  return null
}

function requiredRole(submitted: SubmittedDetails) {
  const ready = submitted.steps.find((step) => step.routingStatus === 'READY')
  return ready?.requiredRoleCode ?? 'MANAGER'
}

function daysBetween(from?: string | null) {
  if (!from) return 0
  const start = new Date(from)
  if (Number.isNaN(start.getTime())) return 0
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const now = new Date()
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((nowDay - startDay) / 86_400_000))
}

function previousStepLabel(role?: string | null) {
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

function currentAwaitingRole(submitted: SubmittedDetails) {
  if (!isOpenStatus(submitted.submissionStatus)) return null
  return requiredRole(submitted)
}

function roleDecision(submitted: SubmittedDetails) {
  return submitted.actions.filter(
    (action) =>
      (action.actionType === 'APPROVE' || action.actionType === 'RETURN') &&
      (action.actorRoleCode === 'MANAGER' ||
        action.actorRoleCode === 'CDH' ||
        action.actorRoleCode === 'LTH'),
  ).at(-1) ?? null
}

function isClosedSubmission(status: string) {
  return status === 'APPROVED' || status === 'RETURNED' || status === 'WITHDRAWN'
}

function toQueueItem(exercise: Exercise, submitted: SubmittedDetails): ApprovalQueueItem {
  const deliveryHc = (exercise.snapshot.sharedKpis ?? []).reduce(
    (sum, item) => sum + Number(item.deliveryHc || 0),
    0,
  )
  const previousActions = submitted.actions.filter((action) => action.actionType === 'APPROVE')
  const previous = previousActions[previousActions.length - 1] ?? null
  const last = submitted.actions.filter(
    (action) => action.actionType === 'SUBMIT' || action.actionType === 'APPROVE',
  ).at(-1) ?? null
  const supervisor =
    submitted.actions.find((action) => action.actionType === 'SUBMIT')?.actorDisplayName ?? null
  const agingFrom = previous?.actionAt ?? submitted.submittedAt
  const closeActions = submitted.actions.filter(
    (action) =>
      action.actionType === 'RETURN' ||
      action.actionType === 'WITHDRAW' ||
      action.actionType === 'APPROVE',
  )
  const mine = roleDecision(submitted)
  const archivedAt = isClosedSubmission(submitted.submissionStatus)
    ? (closeActions[closeActions.length - 1]?.actionAt ?? submitted.submittedAt)
    : submitted.submittedAt
  return {
    submissionId: submitted.submissionId,
    exerciseId: exercise.id,
    exerciseCode: exercise.exerciseCode,
    center: exercise.snapshot.toolkit.center,
    domain: exercise.snapshot.toolkit.domain,
    pl3Name: exercise.snapshot.toolkit.pl3Name,
    toolkitName: exercise.snapshot.toolkit.name,
    supervisor,
    deliveryHc,
    rightSizingHc: null,
    productionSupport: 0,
    capacityCreation: null,
    previousStep: previous ? previousStepLabel(previous.actorRoleCode) : null,
    previousActor: last?.actorDisplayName ?? supervisor,
    previousStepAt: last?.actionAt ?? submitted.submittedAt,
    agingDays: daysBetween(agingFrom),
    createdAt: exercise.createdAt,
    submittedAt: submitted.submittedAt,
    archivedAt,
    finalStatus: submitted.submissionStatus === 'APPROVED'
      ? 'Approved'
      : submitted.submissionStatus === 'RETURNED' || submitted.submissionStatus === 'WITHDRAWN'
        ? 'Rejected'
        : null,
    reviewDurationDays: isClosedSubmission(submitted.submissionStatus)
      ? daysBetween(submitted.submittedAt)
      : null,
    status: submitted.submissionStatus,
    myDecision:
      mine?.actionType === 'APPROVE' ? 'Approved' : mine?.actionType === 'RETURN' ? 'Returned' : null,
    myCompletedAt: mine?.actionAt ?? null,
    completedStep: mine ? previousStepLabel(mine.actorRoleCode) : null,
  }
}

function toDetail(exercise: Exercise, submitted: SubmittedDetails): ApprovalDetailView {
  const canDecide = isOpenStatus(submitted.submissionStatus)
  return {
    exerciseId: exercise.id,
    exerciseCode: exercise.exerciseCode,
    workflowStatus: exercise.workflowStatus,
    submittedAt: submitted.submittedAt,
    scenarioId: submitted.scenarioId,
    scenarioName: submitted.scenarioName,
    submissionId: submitted.submissionId,
    submissionCode: submitted.submissionCode,
    submissionStatus: submitted.submissionStatus,
    currentStep: submitted.currentStep,
    requiredRole: requiredRole(submitted),
    remarks: submitted.remarks,
    scopes: submitted.scopes,
    workflowInstanceId: submitted.workflowInstanceId,
    workflowStatusLabel: submitted.workflowStatusLabel,
    steps: submitted.steps,
    actions: submitted.actions.map((action) => ({
      stepNo: action.stepNo ?? 0,
      actionType: action.actionType,
      actorCcgid: action.actorCcgid ?? null,
      actorRoleCode: action.actorRoleCode ?? null,
      actorDisplayName: action.actorDisplayName ?? null,
      comments: action.comments ?? null,
      actionAt: action.actionAt ?? submitted.submittedAt,
      requestId: action.requestId,
    })),
    canDecide,
    workspace: buildApprovalWorkspace(submitted, {
      inProgress: canDecide,
      mineStepNo: canDecide ? null : roleDecision(submitted)?.stepNo,
    }),
  }
}

function listSubmitted() {
  return exercises
    .map((exercise) => {
      const shell = exerciseShells.get(exercise.id) ?? ensureShell(exercise)
      return shell.submitted ? { exercise, submitted: shell.submitted } : null
    })
    .filter((item): item is { exercise: Exercise; submitted: SubmittedDetails } => Boolean(item))
}

function toDateKey(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function matchesQueueItem(
  item: ApprovalQueueItem,
  params: {
    exerciseCode?: string | null
    toolkitName?: string | null
    pl3Name?: string | null
    submittedFrom?: string | null
    submittedTo?: string | null
    completedFrom?: string | null
    completedTo?: string | null
    decision?: string | null
  },
) {
  const code = params.exerciseCode?.trim().toLowerCase()
  if (code && !item.exerciseCode.toLowerCase().includes(code)) return false
  if (params.toolkitName && item.toolkitName !== params.toolkitName) return false
  if (params.pl3Name && item.pl3Name !== params.pl3Name) return false
  const submitted = toDateKey(item.submittedAt)
  if (params.submittedFrom && submitted < params.submittedFrom) return false
  if (params.submittedTo && submitted > params.submittedTo) return false
  const completed = toDateKey(item.myCompletedAt)
  if (params.completedFrom && (!completed || completed < params.completedFrom)) return false
  if (params.completedTo && (!completed || completed > params.completedTo)) return false
  if (params.decision && item.myDecision !== params.decision) return false
  return true
}

function queueMetrics(items: ApprovalQueueItem[]) {
  return {
    awaitingMe: items.length,
    overdue: items.filter((item) => (item.agingDays ?? 0) >= 5).length,
    dueWithin2Days: items.filter((item) => {
      const days = item.agingDays ?? 0
      return days >= 3 && days < 5
    }).length,
    highRisk: items.filter((item) => (item.agingDays ?? 0) >= 5).length,
  }
}

function uniqueNames(items: ApprovalQueueItem[], key: 'toolkitName' | 'pl3Name') {
  return [
    ...new Set(items.map((item) => item[key]).filter((name): name is string => Boolean(name))),
  ].sort()
}

export const approvalHandlers = [
  http.get('*/api/v1/approvals/queue', ({ request }) => {
    const url = new URL(request.url)
    const completed = url.searchParams.get('completed') === 'true'
    const statusParam = url.searchParams.get('status')
    const wantOpen =
      !statusParam || statusParam === 'OPEN' || statusParam === 'AWAITING'
    const awaiting = listSubmitted()
      .filter((item) => isOpenStatus(item.submitted.submissionStatus))
      .map((item) => toQueueItem(item.exercise, item.submitted))
    const source = completed
      ? listSubmitted()
          .map((item) => {
            const row = toQueueItem(item.exercise, item.submitted)
            const mine = roleDecision(item.submitted)
            const current = currentAwaitingRole(item.submitted)
            return { row, include: Boolean(row.myDecision) && (!current || current !== mine?.actorRoleCode) }
          })
          .filter((item) => item.include)
          .map((item) => item.row)
          .sort(
            (a, b) =>
              new Date(b.myCompletedAt ?? 0).getTime() - new Date(a.myCompletedAt ?? 0).getTime(),
          )
      : wantOpen
        ? awaiting
        : []
    const items = source.filter((item) =>
      matchesQueueItem(item, {
        exerciseCode: url.searchParams.get('exerciseCode'),
        toolkitName: url.searchParams.get('toolkitName'),
        pl3Name: url.searchParams.get('pl3Name'),
        submittedFrom: url.searchParams.get('submittedFrom'),
        submittedTo: url.searchParams.get('submittedTo'),
        completedFrom: url.searchParams.get('completedFrom'),
        completedTo: url.searchParams.get('completedTo'),
        decision: url.searchParams.get('decision'),
      }),
    )
    if (!completed) {
      items.sort((a, b) => (b.agingDays ?? 0) - (a.agingDays ?? 0))
    }
    const paged = pageOf(items, pageParams(url).page, pageParams(url).pageSize)
    return HttpResponse.json({
      ...paged,
      metrics: queueMetrics(awaiting),
      toolkitNames: uniqueNames(source, 'toolkitName'),
      pl3Names: uniqueNames(source, 'pl3Name'),
    })
  }),

  http.get('*/api/v1/approvals/:submissionId', ({ params }) => {
    const ctx = findBySubmission(params.submissionId)
    if (!ctx) return problem(404, 'The Submission was not found.')
    return HttpResponse.json(toDetail(ctx.exercise, ctx.submitted))
  }),

  http.post('*/api/v1/approvals/:submissionId/approve', async ({ params, request }) => {
    const ctx = findBySubmission(params.submissionId)
    if (!ctx) return problem(404, 'The Submission was not found.')
    if (!isOpenStatus(ctx.submitted.submissionStatus)) {
      return problem(409, 'Submission is not awaiting approval.')
    }
    const body = ((await request.json().catch(() => ({}))) ?? {}) as ApproveRequest
    const requestId = body.requestId ?? crypto.randomUUID()
    if (ctx.submitted.actions.some((action) => action.requestId === requestId)) {
      return HttpResponse.json(toDetail(ctx.exercise, ctx.submitted))
    }

    const now = new Date().toISOString()
    const step = ctx.submitted.steps.find((item) => item.routingStatus === 'READY')
    const stepNo = step?.stepNo ?? ctx.submitted.currentStep ?? 1
    const role = step?.requiredRoleCode ?? 'MANAGER'

    if (step) step.routingStatus = 'ACTED'
    ctx.submitted.actions.push({
      stepNo,
      actionType: 'APPROVE',
      actorCcgid: crypto.randomUUID(),
      actorRoleCode: role,
      actorDisplayName: 'Approver',
      comments: body.comments ?? null,
      actionAt: now,
      requestId,
    })

    // Happy-path MSW: single approve completes the submission.
    ctx.submitted.submissionStatus = 'APPROVED'
    ctx.submitted.workflowStatusLabel = 'COMPLETED'
    ctx.submitted.currentStep = stepNo
    ctx.exercise.workflowStatus = 'APPROVED'
    syncFlags(ctx.exercise)
    return HttpResponse.json(toDetail(ctx.exercise, ctx.submitted))
  }),

  http.post('*/api/v1/approvals/:submissionId/return', async ({ params, request }) => {
    const ctx = findBySubmission(params.submissionId)
    if (!ctx) return problem(404, 'The Submission was not found.')
    if (!isOpenStatus(ctx.submitted.submissionStatus)) {
      return problem(409, 'Submission is not awaiting approval.')
    }
    const body = ((await request.json().catch(() => ({}))) ?? {}) as ReturnRequest
    if (!body.comments?.trim()) {
      return problem(422, 'Return comments are required.')
    }
    const requestId = body.requestId ?? crypto.randomUUID()
    if (ctx.submitted.actions.some((action) => action.requestId === requestId)) {
      return HttpResponse.json(toDetail(ctx.exercise, ctx.submitted))
    }

    const now = new Date().toISOString()
    const step = ctx.submitted.steps.find((item) => item.routingStatus === 'READY')
    const stepNo = step?.stepNo ?? ctx.submitted.currentStep ?? 1
    const role = step?.requiredRoleCode ?? 'MANAGER'

    if (step) step.routingStatus = 'ACTED'
    ctx.submitted.actions.push({
      stepNo,
      actionType: 'RETURN',
      actorCcgid: crypto.randomUUID(),
      actorRoleCode: role,
      actorDisplayName: 'Approver',
      comments: body.comments,
      actionAt: now,
      requestId,
    })
    ctx.submitted.submissionStatus = 'RETURNED'
    ctx.submitted.workflowStatusLabel = 'RETURNED'
    ctx.exercise.workflowStatus = 'RETURNED'
    syncFlags(ctx.exercise)
    return HttpResponse.json(toDetail(ctx.exercise, ctx.submitted))
  }),
]
