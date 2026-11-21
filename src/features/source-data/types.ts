export type CenterSourceMode = 'TIMESHEET' | 'MYHR_SKPI'

export type CenterSource = {
  center: string
  mode: CenterSourceMode
}

export type SiteMapping = {
  gbsSite: string
  siteCode: string
  center: string
}

export type SourceFile = {
  id: string | null
  kind: string
  sourceFileName: string | null
  syncDate: string | null
  period: string | null
  rowCount: number | null
  hasSourceFile: boolean
}

export type CurrentSource = {
  center: string
  mode: CenterSourceMode
  files: SourceFile[]
}

export type SourcePage<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type SourcePerson = {
  ccgid: string
  empId: string | null
  name: string
  email: string | null
  jobRole: string | null
  center: string | null
  positionId: string | null
  roleType: string | null
}

export type SourceSeat = {
  ccgid: string
  name: string
  positionId: string
  roleType: string
  center: string | null
}

export type SourcePosition = {
  positionId: string
  roleType: string
  parentPositionId: string | null
  parentRoleType: string | null
  occupantName: string | null
  center: string | null
}

export type SourceProcess = {
  domain: string | null
  pl1: string | null
  pl2: string | null
  pl3Code: string
  pl3Name: string | null
  center: string | null
}

export type SourceDeliveryHc = {
  pl3Code: string
  carrier: string
  site: string
  customerCountry: string
  hc: number | string
  center: string | null
}

export type ImportResult = {
  id: string
  kind: string
  status: string
  syncDate: string
  period: string | null
  rowCount: number | null
  issueCount: number
}

export type SourceTableQuery = {
  center: string
  q?: string
  page: number
  pageSize: number
}
