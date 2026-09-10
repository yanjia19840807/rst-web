import type { AppRole } from '@/auth/permissions'

/** Landing page for each RST product role. Multi-role users take the highest entry. */
export const ROLE_HOME_PATH: Record<AppRole, string> = {
  AGENT: '/agent/session',
  SUPERVISOR: '/supervisor/toolkits',
  SR_MANAGER: '/approver/queue',
  DOMAIN_HEAD: '/approver/queue',
  LOCAL_TRANSFORMATION_HEAD: '/approver/queue',
  GOVERNANCE: '/approver/dashboard',
  ADMIN: '/approver/dashboard',
}

const HOME_ROLE_PRIORITY: readonly AppRole[] = [
  'ADMIN',
  'GOVERNANCE',
  'LOCAL_TRANSFORMATION_HEAD',
  'DOMAIN_HEAD',
  'SR_MANAGER',
  'SUPERVISOR',
  'AGENT',
]

export function homePathForRoles(roles: readonly AppRole[]): string {
  const role = HOME_ROLE_PRIORITY.find((item) => roles.includes(item))
  return ROLE_HOME_PATH[role ?? 'AGENT']
}
