import { setupWorker } from 'msw/browser'

import { approvalHandlers } from './handlers/approval'
import { supervisorHandlers } from './handlers/supervisor'
import { tmsHandlers } from './handlers/tms'

export const worker = setupWorker(...tmsHandlers, ...supervisorHandlers, ...approvalHandlers)
