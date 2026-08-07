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

const OPEN_STATUSES = new Set(['AWAITING_MANAGER', 'AWAITING_CDH', 'AWAITING_LTH'])
const ARCHIVED_STATUSES = new Set(['VALIDATED', 'RETURNED', 'ARCHIVED'])

function problem(status: number, detail: string) {
  return HttpResponse.json({ title: 'Approval request failed', status, detail }, { status })
}

function syncFlags(exercise: Exercise) {
  const shell = ensureShell(exercise)
  exercise.officialScenarioId =
    shell.scenarios.find((item) => item.status === 'OFFICIAL')?.id ?? null
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

function toQueueItem(exercise: Exercise, submitted: SubmittedDetails): ApprovalQueueItem {
  return {
    submissionId: submitted.submissionId,
    exerciseCode: exercise.exerciseCode,
    packageVersion: submitted.packageVersion,
    currentStep: submitted.currentStep,
    requiredRole: requiredRole(submitted),
    status: submitted.submissionStatus,
    submittedAt: submitted.submittedAt,
  }
}

function toDetail(exercise: Exercise, submitted: SubmittedDetails): ApprovalDetailView {
  return {
    exerciseId: exercise.id,
    exerciseCode: exercise.exerciseCode,
    workflowStatus: exercise.workflowStatus,
    submittedAt: submitted.submittedAt,
    officialPackageId: submitted.officialPackageId,
    packageVersion: submitted.packageVersion,
    packageStatus: submitted.packageStatus ?? 'LOCKED',
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
      actorUserId: action.actorUserId ?? null,
      actorRoleCode: action.actorRoleCode ?? null,
      comments: action.comments ?? null,
      actionAt: action.actionAt ?? submitted.submittedAt,
      requestId: action.requestId,
    })),
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

export const approvalHandlers = [
  http.get('*/api/v1/approvals/queue', ({ request }) => {
    const url = new URL(request.url)
    const archived = url.searchParams.get('archived') === 'true'
    const statuses = archived ? ARCHIVED_STATUSES : OPEN_STATUSES
    const items = listSubmitted()
      .filter((item) => statuses.has(item.submitted.submissionStatus))
      .sort(
        (a, b) =>
          new Date(b.submitted.submittedAt).getTime() - new Date(a.submitted.submittedAt).getTime(),
      )
      .map((item) => toQueueItem(item.exercise, item.submitted))
    return HttpResponse.json(items)
  }),

  http.get('*/api/v1/approvals/:submissionId', ({ params }) => {
    const ctx = findBySubmission(params.submissionId)
    if (!ctx) return problem(404, 'The Submission was not found.')
    return HttpResponse.json(toDetail(ctx.exercise, ctx.submitted))
  }),

  http.post('*/api/v1/approvals/:submissionId/approve', async ({ params, request }) => {
    const ctx = findBySubmission(params.submissionId)
    if (!ctx) return problem(404, 'The Submission was not found.')
    if (!OPEN_STATUSES.has(ctx.submitted.submissionStatus)) {
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
      actorUserId: crypto.randomUUID(),
      actorRoleCode: role,
      comments: body.comments ?? null,
      actionAt: now,
      requestId,
    })

    // Happy-path MSW: single approve validates the submission.
    ctx.submitted.submissionStatus = 'VALIDATED'
    ctx.submitted.workflowStatusLabel = 'COMPLETED'
    ctx.submitted.packageStatus = 'VALIDATED'
    ctx.submitted.currentStep = stepNo
    ctx.exercise.workflowStatus = 'VALIDATED'
    syncFlags(ctx.exercise)
    return HttpResponse.json(toDetail(ctx.exercise, ctx.submitted))
  }),

  http.post('*/api/v1/approvals/:submissionId/return', async ({ params, request }) => {
    const ctx = findBySubmission(params.submissionId)
    if (!ctx) return problem(404, 'The Submission was not found.')
    if (!OPEN_STATUSES.has(ctx.submitted.submissionStatus)) {
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
      actorUserId: crypto.randomUUID(),
      actorRoleCode: role,
      comments: body.comments,
      actionAt: now,
      requestId,
    })
    ctx.submitted.submissionStatus = 'RETURNED'
    ctx.submitted.workflowStatusLabel = 'RETURNED'
    ctx.submitted.packageStatus = 'RETURNED'
    ctx.exercise.workflowStatus = 'IN_PROGRESS'
    ctx.exercise.officialScenarioId = null
    syncFlags(ctx.exercise)
    return HttpResponse.json(toDetail(ctx.exercise, ctx.submitted))
  }),
]
