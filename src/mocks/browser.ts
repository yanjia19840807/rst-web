import { setupWorker } from 'msw/browser'

import { approvalHandlers } from './handlers/approval'
import { delegationHandlers } from './handlers/delegation'
import { domainHeadHandlers } from './handlers/domain-heads'
import { governanceHandlers } from './handlers/governance'
import { mailPreferenceHandlers } from './handlers/mail-preferences'
import { meHandlers } from './handlers/me'
import { supervisorHandlers } from './handlers/supervisor'
import { supportCategoryHandlers } from './handlers/support-category'
import { timesheetHandlers } from './handlers/timesheet'
import { timesheetSyncHandlers } from './handlers/timesheet-sync'
import { tmsHandlers } from './handlers/tms'

export const worker = setupWorker(
  ...meHandlers,
  ...mailPreferenceHandlers,
  ...timesheetHandlers,
  ...timesheetSyncHandlers,
  ...tmsHandlers,
  ...supervisorHandlers,
  ...supportCategoryHandlers,
  ...approvalHandlers,
  ...domainHeadHandlers,
  ...delegationHandlers,
  ...governanceHandlers,
)
