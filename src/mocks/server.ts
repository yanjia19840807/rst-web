import { setupServer } from 'msw/node'

import { approvalHandlers } from './handlers/approval'
import { supervisorHandlers } from './handlers/supervisor'
import { tmsHandlers } from './handlers/tms'

export const server = setupServer(...tmsHandlers, ...supervisorHandlers, ...approvalHandlers)
