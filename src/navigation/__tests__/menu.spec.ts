import { describe, expect, it } from 'vitest'

import { permissionsForRoles, type AppRole } from '@/auth/permissions'

import { isAgentWorkspace, isMenuItemActive, menuItems } from '../menu'

function visibleLabels(roles: readonly AppRole[]) {
  const allowed = new Set(permissionsForRoles(roles))
  return menuItems.filter((item) => allowed.has(item.permission)).map((item) => item.label)
}

describe('menu order', () => {
  it('puts Global Dashboard first for HO, with reports after it', () => {
    expect(visibleLabels(['GOVERNANCE'])).toEqual([
      'Global Dashboard',
      'RST Repository',
      'Support Repository',
      'Benchmarking',
    ])
  })

  it('unions Supervisor, Sr Manager and Domain Head without agent or admin tools', () => {
    expect(visibleLabels(['SUPERVISOR', 'SR_MANAGER', 'DOMAIN_HEAD'])).toEqual([
      'Team TMS',
      'Toolkits',
      'Exercises',
      'Approval Queue',
    ])
  })

  it('puts Global Dashboard first and admin tools last for Admin', () => {
    expect(visibleLabels(['ADMIN'])).toEqual([
      'Global Dashboard',
      'RST Repository',
      'Support Repository',
      'Validation Workflow',
      'Benchmarking',
      'Timesheet Sync',
      'Support Categories',
    ])
  })
})

describe('report submission routes', () => {
  it('keeps the source report active and leaves the approval queue inactive', () => {
    const item = (label: string) => menuItems.find((entry) => entry.label === label)!
    expect(isMenuItemActive(item('RST Repository'), '/approver/repository/submissions/abc')).toBe(
      true,
    )
    expect(isMenuItemActive(item('Approval Queue'), '/approver/repository/submissions/abc')).toBe(
      false,
    )
    expect(
      isMenuItemActive(item('Support Repository'), '/approver/support-repository/submissions/abc'),
    ).toBe(true)
    expect(
      isMenuItemActive(
        item('Validation Workflow'),
        '/approver/validation-workflow/submissions/abc',
      ),
    ).toBe(true)
    expect(
      isMenuItemActive(item('RST Repository'), '/approver/support-repository/submissions/abc'),
    ).toBe(false)
  })
})

describe('isAgentWorkspace', () => {
  it('is true when every visible item is an agent TMS route', () => {
    const agentItems = menuItems.filter((item) => item.to.startsWith('/agent/'))
    expect(isAgentWorkspace(agentItems)).toBe(true)
  })

  it('is false when the user also has other modules', () => {
    expect(isAgentWorkspace(menuItems)).toBe(false)
    expect(isAgentWorkspace([])).toBe(false)
  })
})
