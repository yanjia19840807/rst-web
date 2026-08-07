export interface ApprovalQueueItem {
  submissionId: string
  exerciseCode: string
  packageVersion: number
  currentStep: number | null
  requiredRole: string
  status: string
  submittedAt: string
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
  assigneeUserId: string | null
  routingStatus: string
}

export interface ActionView {
  stepNo: number
  actionType: string
  actorUserId: string | null
  actorRoleCode: string | null
  comments: string | null
  actionAt: string
  requestId: string | null
}

export interface ApprovalDetailView {
  exerciseId: string
  exerciseCode: string
  workflowStatus: string
  submittedAt: string
  officialPackageId: string
  packageVersion: number
  packageStatus: string
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
}

export interface ApproveRequest {
  comments?: string | null
  requestId?: string | null
}

export interface ReturnRequest {
  comments: string
  requestId?: string | null
}
