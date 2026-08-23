import { PERMISSIONS, type Permission } from '@/auth/permissions'

export type MenuItem = {
  label: string
  to: string
  permission: Permission
  /** Prefixes that should keep this item highlighted (detail/edit child routes). */
  match?: readonly string[]
}

/** Flat, de-duplicated app menu. Visibility is permission-driven. */
export const menuItems: readonly MenuItem[] = [
  {
    label: 'TMS Session',
    to: '/agent/session',
    permission: PERMISSIONS.tmsSession,
  },
  {
    label: 'TMS List',
    to: '/agent/sessions',
    permission: PERMISSIONS.tmsList,
    match: ['/agent/sessions'],
  },
  {
    label: 'TMS List',
    to: '/supervisor/sessions',
    permission: PERMISSIONS.tmsTeamList,
    match: ['/supervisor/sessions'],
  },
  {
    label: 'Toolkits',
    to: '/supervisor/toolkits',
    permission: PERMISSIONS.toolkitManage,
    match: ['/supervisor/toolkits'],
  },
  {
    label: 'Exercises',
    to: '/supervisor/exercises',
    permission: PERMISSIONS.exerciseManage,
    match: ['/supervisor/exercises'],
  },
  {
    label: 'Approval Queue',
    to: '/approver/queue',
    permission: PERMISSIONS.approvalQueue,
    match: ['/approver/queue', '/approver/submissions'],
  },
  {
    label: 'Domain Head',
    to: '/approver/domain-heads',
    permission: PERMISSIONS.domainHeadConfig,
  },
  {
    label: 'RST Repository',
    to: '/approver/repository',
    permission: PERMISSIONS.governanceRepository,
  },
  {
    label: 'Support Repository',
    to: '/approver/support-repository',
    permission: PERMISSIONS.governanceSupport,
  },
  {
    label: 'Validation Workflow',
    to: '/approver/validation-workflow',
    permission: PERMISSIONS.governanceValidationWorkflow,
  },
  {
    label: 'Global Dashboard',
    to: '/approver/dashboard',
    permission: PERMISSIONS.governanceDashboard,
  },
  {
    label: 'Benchmarking',
    to: '/approver/benchmarking',
    permission: PERMISSIONS.governanceBenchmarking,
  },
]

export function isMenuItemActive(item: MenuItem, path: string) {
  const prefixes = item.match ?? [item.to]
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}
