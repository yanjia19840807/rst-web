export const AWAITING_REVIEW_TAB = 'Awaiting Review' as const
export const COMPLETED_TASK_TAB = 'Completed Task' as const

export type ApprovalQueueTab = typeof AWAITING_REVIEW_TAB | typeof COMPLETED_TASK_TAB
export type ApprovalQueueTabQuery = 'AWAITING' | 'COMPLETED'

export function approvalQueueTabFromQuery(value: unknown): ApprovalQueueTab {
  return value === 'COMPLETED' ? COMPLETED_TASK_TAB : AWAITING_REVIEW_TAB
}

export function approvalQueueTabQuery(tab: ApprovalQueueTab): ApprovalQueueTabQuery {
  return tab === COMPLETED_TASK_TAB ? 'COMPLETED' : 'AWAITING'
}

/** Prefer the tab the reviewer entered from; fall back to the workspace mode. */
export function approvalQueueTabQueryFromReview(
  routeTab: unknown,
  workspaceMode?: string | null,
): ApprovalQueueTabQuery {
  if (routeTab === 'COMPLETED' || routeTab === 'AWAITING') return routeTab
  return workspaceMode === 'COMPLETED' ? 'COMPLETED' : 'AWAITING'
}

export function approvalQueueLocation(
  routeTab?: unknown,
  workspaceMode?: string | null,
) {
  return {
    name: 'approver-queue' as const,
    query: { tab: approvalQueueTabQueryFromReview(routeTab, workspaceMode) },
  }
}

export function approvalQueueBackLabel(
  routeTab?: unknown,
  workspaceMode?: string | null,
) {
  return approvalQueueTabFromQuery(approvalQueueTabQueryFromReview(routeTab, workspaceMode))
    === COMPLETED_TASK_TAB
    ? '← Back to Completed Task'
    : '← Back to Awaiting Review'
}
