export const PERMISSIONS = {
  tmsSession: 'tms:session',
  tmsList: 'tms:list',
  tmsTeamList: 'tms:team-list',
  toolkitManage: 'toolkit:manage',
  exerciseManage: 'exercise:manage',
  approvalQueue: 'approval:queue',
  domainHeadConfig: 'approver:domain-heads',
  timesheetSync: 'timesheet:sync',
  governanceRepository: 'governance:repository',
  governanceSupport: 'governance:support',
  governanceValidationWorkflow: 'governance:validation-workflow',
  governanceDashboard: 'governance:dashboard',
  governanceBenchmarking: 'governance:benchmarking',
  supportCategoryManage: 'support-category:manage',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/** RST product roles (aligned with backend / Role Matrix). */
export type AppRole = 'AGENT' | 'SUPERVISOR' | 'SR_MANAGER' | 'DOMAIN_HEAD' | 'LOCAL_TRANSFORMATION_HEAD' | 'GOVERNANCE' | 'ADMIN'

const SHARED_REPORTS: readonly Permission[] = [
  PERMISSIONS.governanceRepository,
  PERMISSIONS.governanceSupport,
  PERMISSIONS.governanceDashboard,
  PERMISSIONS.governanceBenchmarking,
]

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  AGENT: [PERMISSIONS.tmsSession, PERMISSIONS.tmsList],
  SUPERVISOR: [
    PERMISSIONS.tmsTeamList,
    PERMISSIONS.toolkitManage,
    PERMISSIONS.exerciseManage,
  ],
  SR_MANAGER: [PERMISSIONS.approvalQueue],
  DOMAIN_HEAD: [PERMISSIONS.approvalQueue],
  LOCAL_TRANSFORMATION_HEAD: [
    PERMISSIONS.approvalQueue,
    PERMISSIONS.domainHeadConfig,
    PERMISSIONS.timesheetSync,
    PERMISSIONS.governanceValidationWorkflow,
    ...SHARED_REPORTS,
  ],
  GOVERNANCE: [...SHARED_REPORTS],
  ADMIN: [
    PERMISSIONS.timesheetSync,
    PERMISSIONS.domainHeadConfig,
    PERMISSIONS.governanceValidationWorkflow,
    PERMISSIONS.supportCategoryManage,
    ...SHARED_REPORTS,
  ],
}

const APP_ROLES = new Set<string>([
  'AGENT',
  'SUPERVISOR',
  'SR_MANAGER',
  'DOMAIN_HEAD',
  'LOCAL_TRANSFORMATION_HEAD',
  'GOVERNANCE',
  'ADMIN',
])

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.has(value)
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
  SR_MANAGER: 'Sr Manager',
  DOMAIN_HEAD: 'Domain Head',
  LOCAL_TRANSFORMATION_HEAD: 'Local Transformation Head',
  GOVERNANCE: 'Governance',
  ADMIN: 'Admin',
}
