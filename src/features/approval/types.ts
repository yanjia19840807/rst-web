export interface ApprovalQueueItem {
  submissionId: string
  exerciseId: string
  exerciseCode: string
  center?: string | null
  domain?: string | null
  pl3Name?: string | null
  toolkitName?: string | null
  supervisor?: string | null
  deliveryHc?: number | string | null
  rightSizingHc?: number | string | null
  productionSupport?: number | string | null
  capacityCreation?: number | string | null
  previousStep?: string | null
  previousActor?: string | null
  previousStepAt?: string | null
  agingDays?: number | null
  createdAt?: string | null
  submittedAt: string
  archivedAt?: string | null
  finalStatus?: string | null
  reviewDurationDays?: number | null
  status: string
  myDecision?: string | null
  myCompletedAt?: string | null
  completedStep?: string | null
}

export interface ApprovalQueueMetrics {
  awaitingMe: number
  overdue: number
  dueWithin2Days: number
  highRisk: number
}

export interface ApprovalQueueView {
  items: ApprovalQueueItem[]
  metrics: ApprovalQueueMetrics
  toolkitNames: string[]
  pl3Names: string[]
}

export interface ApprovalQueueQuery {
  status?: string
  completed?: boolean
  exerciseCode?: string
  toolkitName?: string
  pl3Name?: string
  submittedFrom?: string
  submittedTo?: string
  completedFrom?: string
  completedTo?: string
  decision?: string
}

export interface ScopeView {
  scopeLevel: string
  center: string
  site: string
  domain: string
  pl3Code: string
  carrier: string
  customerCountry: string
}

export interface StepView {
  stepNo: number
  requiredRoleCode: string
  assigneeCcgid: string | null
  assigneePositionId?: string | null
  assigneeDisplayName?: string | null
  routingStatus: string
}

export interface ActionView {
  stepNo: number
  actionType: string
  actorCcgid: string | null
  actorRoleCode: string | null
  actorDisplayName?: string | null
  comments: string | null
  actionAt: string
  requestId: string | null
}

export interface ApprovalStatusBar {
  state: 'IN_PROGRESS' | 'NOW' | 'APPROVED' | 'RETURNED' | 'WITHDRAWN' | string
  label: string
  step?: string | null
  reviewer?: string | null
}

export interface ApprovalCurrentHop {
  step?: string | null
  reviewer?: string | null
}

export interface ApprovalHistoryRow {
  actionId: string
  stepNo: number
  step: string
  role: string
  actor?: string | null
  decision: string
  comments?: string | null
  completedAt: string
  mine?: boolean
}

export interface ApprovalWorkspaceView {
  mode: 'IN_PROGRESS' | 'COMPLETED'
  statusBar: ApprovalStatusBar
  currentHop?: ApprovalCurrentHop | null
  nextStep?: string | null
  nextReviewer?: string | null
  history: ApprovalHistoryRow[]
}

export interface ApprovalDetailView {
  exerciseId: string
  exerciseCode: string
  workflowStatus: string
  submittedAt: string
  scenarioId: string
  scenarioName: string | null
  submissionId: string
  submissionCode: string
  submissionStatus: string
  currentStep: number | null
  requiredRole: string
  remarks: string | null
  scopes: ScopeView[]
  workflowInstanceId: string
  workflowStatusLabel: string
  steps: StepView[]
  actions: ActionView[]
  canDecide?: boolean
  workspace: ApprovalWorkspaceView
}

export interface ApproveRequest {
  comments?: string | null
  requestId?: string | null
}

export interface ReturnRequest {
  comments: string
  requestId?: string | null
}
