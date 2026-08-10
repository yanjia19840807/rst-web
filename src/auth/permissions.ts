export const PERMISSIONS = {
  tmsSession: 'tms:session',
  tmsList: 'tms:list',
  toolkitManage: 'toolkit:manage',
  exerciseManage: 'exercise:manage',
  holidayTemplateManage: 'holiday-template:manage',
  approvalQueue: 'approval:queue',
  governanceRepository: 'governance:repository',
  governanceSupport: 'governance:support',
  governanceValidationWorkflow: 'governance:validation-workflow',
  governanceDashboard: 'governance:dashboard',
  governanceBenchmarking: 'governance:benchmarking',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export type AppRole = 'AGENT' | 'SUPERVISOR' | 'APPROVER' | 'HO'

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  AGENT: [PERMISSIONS.tmsSession, PERMISSIONS.tmsList],
  SUPERVISOR: [
    PERMISSIONS.toolkitManage,
    PERMISSIONS.exerciseManage,
    PERMISSIONS.holidayTemplateManage,
  ],
  APPROVER: [
    PERMISSIONS.approvalQueue,
    PERMISSIONS.holidayTemplateManage,
    PERMISSIONS.governanceRepository,
    PERMISSIONS.governanceSupport,
    PERMISSIONS.governanceValidationWorkflow,
    PERMISSIONS.governanceDashboard,
    PERMISSIONS.governanceBenchmarking,
  ],
  HO: [
    PERMISSIONS.holidayTemplateManage,
    PERMISSIONS.governanceRepository,
    PERMISSIONS.governanceSupport,
    PERMISSIONS.governanceDashboard,
    PERMISSIONS.governanceBenchmarking,
  ],
}

export function permissionsForRoles(roles: readonly AppRole[]): Permission[] {
  const set = new Set<Permission>()
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      set.add(permission)
    }
  }
  return [...set]
}

export const ROLE_LABELS: Record<AppRole, string> = {
  AGENT: 'Agent',
  SUPERVISOR: 'Supervisor',
  APPROVER: 'Approver',
  HO: 'HO',
}
