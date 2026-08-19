import { setupServer } from 'msw/node'

import { approvalHandlers } from './handlers/approval'
import { governanceHandlers } from './handlers/governance'
import { meHandlers } from './handlers/me'
import { supervisorHandlers } from './handlers/supervisor'
import { supportTaxonomyHandlers } from './handlers/support-taxonomy'
import { tmsHandlers } from './handlers/tms'

export const server = setupServer(
  ...meHandlers,
  ...tmsHandlers,
  ...supervisorHandlers,
  ...supportTaxonomyHandlers,
  ...approvalHandlers,
  ...governanceHandlers,
)
