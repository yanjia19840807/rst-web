import { setupServer } from 'msw/node'

import { approvalHandlers } from './handlers/approval'
import { domainHeadHandlers } from './handlers/domain-heads'
import { governanceHandlers } from './handlers/governance'
import { meHandlers } from './handlers/me'
import { supervisorHandlers } from './handlers/supervisor'
import { supportTaxonomyHandlers } from './handlers/support-taxonomy'
import { timesheetHandlers } from './handlers/timesheet'
import { tmsHandlers } from './handlers/tms'

export const server = setupServer(
  ...meHandlers,
  ...timesheetHandlers,
  ...tmsHandlers,
  ...supervisorHandlers,
  ...supportTaxonomyHandlers,
  ...approvalHandlers,
  ...domainHeadHandlers,
  ...governanceHandlers,
)
