export const PERMISSIONS = {
  tmsSession: 'tms:session',
  tmsList: 'tms:list',
  tmsTeamList: 'tms:team-list',
  toolkitManage: 'toolkit:manage',
  exerciseManage: 'exercise:manage',
  approvalQueue: 'approval:queue',
  governanceRepository: 'governance:repository',
  governanceSupport: 'governance:support',
  governanceValidationWorkflow: 'governance:validation-workflow',
  governanceDashboard: 'governance:dashboard',
  governanceBenchmarking: 'governance:benchmarking',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/** Six RST product roles (aligned with backend / Role Matrix). */
export type AppRole = 'AGENT' | 'SUPERVISOR' | 'MANAGER' | 'CDH' | 'LTH' | 'HO'

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
  MANAGER: [PERMISSIONS.approvalQueue],
  CDH: [PERMISSIONS.approvalQueue],
  LTH: [
    PERMISSIONS.approvalQueue,
    PERMISSIONS.governanceValidationWorkflow,
    ...SHARED_REPORTS,
  ],
  HO: [...SHARED_REPORTS],
}

const APP_ROLES = new Set<string>([
  'AGENT',
  'SUPERVISOR',
  'MANAGER',
  'CDH',
  'LTH',
  'HO',
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
  MANAGER: 'Manager',
  CDH: 'CDH',
  LTH: 'LTH',
  HO: 'HO',
}
