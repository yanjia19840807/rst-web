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

export type TimesheetSyncRunIssuesQuery = {
  id: string
  page: number
  pageSize: number
}

export type TimesheetSyncIssuesPage = {
  items: TimesheetSyncIssue[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type TimesheetSyncRunDetail = {
  run: TimesheetSyncRunHeader
  issues: TimesheetSyncIssuesPage
}

export type TimesheetSyncAlertConfig = {
  enabled: boolean
  recipients: string[]
}

export type TimesheetSnapshotTab = 'people' | 'positions' | 'scopes' | 'assignments' | 'kpis'

export type TimesheetSnapshotPage<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type TimesheetSnapshotFilters = {
  peopleCenters: string[]
  scopeCenters: string[]
  scopeDomains: string[]
}

export type TimesheetSnapshotPerson = {
  ccgid: string
  empId: string | null
  name: string
  email: string | null
  center: string | null
  positionId: string | null
}

export type TimesheetSnapshotPosition = {
  positionId: string
  roleType: string
  parentPositionId: string | null
}

export type TimesheetSnapshotScope = {
  supervisorPositionId: string
  center: string
  domain: string | null
  pl1: string | null
  pl2: string | null
  pl3Code: string
  pl3Name: string | null
}

export type TimesheetSnapshotAssignment = {
  empCcgid: string
  empId: string | null
  supervisorPositionId: string
  pl3Code: string
}

export type TimesheetSnapshotKpi = {
  supervisorPositionId: string
  pl3Code: string
  carrier: string
  site: string
  customerCountry: string
  hc: number | string
}

export type TimesheetSnapshotPeopleQuery = {
  center?: string
  q?: string
  page: number
  pageSize: number
}

export type TimesheetSnapshotPositionsQuery = {
  roleType?: string
  q?: string
  page: number
  pageSize: number
}

export type TimesheetSnapshotScopesQuery = {
  center?: string
  domain?: string
  q?: string
  page: number
  pageSize: number
}

export type TimesheetSnapshotAssignmentsQuery = {
  supervisorPositionId?: string
  pl3Code?: string
  q?: string
  page: number
  pageSize: number
}

export type TimesheetSnapshotKpisQuery = {
  supervisorPositionId?: string
  pl3Code?: string
  q?: string
  page: number
  pageSize: number
}
