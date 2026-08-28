import { setupServer } from 'msw/node'

import { approvalHandlers } from './handlers/approval'
import { delegationHandlers } from './handlers/delegation'
import { domainHeadHandlers } from './handlers/domain-heads'
import { governanceHandlers } from './handlers/governance'
import { meHandlers } from './handlers/me'
import { supervisorHandlers } from './handlers/supervisor'
import { supportCategoryHandlers } from './handlers/support-category'
import { timesheetHandlers } from './handlers/timesheet'
import { tmsHandlers } from './handlers/tms'

export const server = setupServer(
  ...meHandlers,
  ...timesheetHandlers,
  ...tmsHandlers,
  ...supervisorHandlers,
  ...supportCategoryHandlers,
  ...approvalHandlers,
  ...domainHeadHandlers,
  ...delegationHandlers,
  ...governanceHandlers,
)
