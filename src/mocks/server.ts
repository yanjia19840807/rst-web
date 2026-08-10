import { setupServer } from 'msw/node'

import { approvalHandlers } from './handlers/approval'
import { governanceHandlers } from './handlers/governance'
import { holidayTemplateHandlers } from './handlers/holiday-templates'
import { meHandlers } from './handlers/me'
import { supervisorHandlers } from './handlers/supervisor'
import { tmsHandlers } from './handlers/tms'

export const server = setupServer(
  ...meHandlers,
  ...tmsHandlers,
  ...supervisorHandlers,
  ...holidayTemplateHandlers,
  ...approvalHandlers,
  ...governanceHandlers,
)
