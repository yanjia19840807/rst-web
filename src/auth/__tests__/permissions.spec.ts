import { describe, expect, it } from 'vitest'

import { PERMISSIONS, permissionsForRoles } from '../permissions'

describe('permissionsForRoles', () => {
  it('gives Admin LTH reports, Timesheet sync, and category config', () => {
    const permissions = permissionsForRoles(['ADMIN'])
    expect(permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.timesheetSync,
        PERMISSIONS.governanceRepository,
        PERMISSIONS.governanceSupport,
        PERMISSIONS.governanceDashboard,
        PERMISSIONS.governanceBenchmarking,
        PERMISSIONS.governanceValidationWorkflow,
        PERMISSIONS.supportCategoryManage,
      ]),
    )
    expect(permissions).toContain(PERMISSIONS.domainHeadConfig)
    expect(permissions).not.toContain(PERMISSIONS.approvalQueue)
  })
})
