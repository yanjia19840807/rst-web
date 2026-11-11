import { describe, expect, it } from 'vitest'

import { allowsRoute } from '../access'

function route(path: string, roles: string[]) {
  return {
    path,
    matched: [{ meta: { roles } }],
  } as Parameters<typeof allowsRoute>[0]
}

describe('allowsRoute', () => {
  it('lets Admin open every page the side menu shows', () => {
    expect(allowsRoute(route('/approver/dashboard', ['approver', 'ho']), ['ADMIN'])).toBe(true)
    expect(allowsRoute(route('/approver/repository', ['approver', 'ho']), ['ADMIN'])).toBe(true)
    expect(allowsRoute(route('/approver/timesheet-sync', ['approver']), ['ADMIN'])).toBe(true)
    expect(allowsRoute(route('/approver/validation-workflow', ['approver']), ['ADMIN'])).toBe(true)
    expect(allowsRoute(route('/admin/support-categories', ['admin']), ['ADMIN'])).toBe(true)
    expect(allowsRoute(route('/admin/regions', ['admin']), ['ADMIN'])).toBe(true)
    expect(allowsRoute(route('/approver/clusters', ['ho']), ['ADMIN'])).toBe(true)
    expect(allowsRoute(route('/approver/clusters', ['ho']), ['GOVERNANCE'])).toBe(true)
  })

  it('does not let Admin open Approval Queue', () => {
    expect(allowsRoute(route('/approver/queue', ['approver']), ['ADMIN'])).toBe(false)
    expect(allowsRoute(route('/approver/submissions/abc', ['approver']), ['ADMIN'])).toBe(false)
  })

  it('lets Sr Manager open queue and review, not Admin tools', () => {
    expect(allowsRoute(route('/approver/queue', ['approver']), ['SR_MANAGER'])).toBe(true)
    expect(allowsRoute(route('/approver/submissions/abc', ['approver']), ['SR_MANAGER'])).toBe(true)
    expect(allowsRoute(route('/admin/support-categories', ['admin']), ['SR_MANAGER'])).toBe(false)
    expect(allowsRoute(route('/admin/regions', ['admin']), ['SR_MANAGER'])).toBe(false)
    expect(allowsRoute(route('/approver/clusters', ['ho']), ['SR_MANAGER'])).toBe(false)
  })

  it('lets governance viewers open a report submission, not validation when they lack it', () => {
    expect(
      allowsRoute(route('/approver/repository/submissions/abc', ['approver', 'ho']), ['GOVERNANCE']),
    ).toBe(true)
    expect(
      allowsRoute(route('/approver/support-repository/submissions/abc', ['approver', 'ho']), [
        'ADMIN',
      ]),
    ).toBe(true)
    expect(
      allowsRoute(route('/approver/validation-workflow/submissions/abc', ['approver']), ['ADMIN']),
    ).toBe(true)
    expect(
      allowsRoute(route('/approver/validation-workflow/submissions/abc', ['approver']), [
        'GOVERNANCE',
      ]),
    ).toBe(false)
    expect(
      allowsRoute(route('/approver/repository/submissions/abc', ['approver', 'ho']), ['SUPERVISOR']),
    ).toBe(false)
  })

  it('lets Supervisor open toolkit child routes', () => {
    expect(allowsRoute(route('/supervisor/toolkits/new', ['supervisor']), ['SUPERVISOR'])).toBe(true)
    expect(allowsRoute(route('/approver/dashboard', ['approver', 'ho']), ['SUPERVISOR'])).toBe(false)
  })
})
