export type TimesheetSyncRunHeader = {
  id: string
  kind: 'DAILY' | 'MONTHLY' | string
  status: string
  syncDate: string
  attemptNo: number
  rowCount: number | null
  sourceType: string | null
  sourceFileName: string | null
  sourceEtag: string | null
  triggeredByCcgid: string | null
  errorCode: string | null
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

export type TimesheetSyncIssue = {
  id: string
  code: string
  message: string
  empCcgid: string | null
  positionId: string | null
  pl3Code: string | null
  sourceRow: number | null
}

export type TimesheetSyncRunsPage = {
  items: TimesheetSyncRunHeader[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type TimesheetSyncOverviewQuery = {
  kind?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  page: number
  pageSize: number
}

export type TimesheetSyncOverview = {
  daily: TimesheetSyncRunHeader | null
  monthly: TimesheetSyncRunHeader | null
  runs: TimesheetSyncRunsPage
}

export type TimesheetSyncRunDetail = {
  run: TimesheetSyncRunHeader
  issues: TimesheetSyncIssue[]
}

export type TimesheetSyncAlertConfig = {
  enabled: boolean
  recipients: string[]
}
