export type TmsSessionStatus = 'running' | 'paused' | 'completed' | 'discarded'

export type ToolkitSharedKpi = {
  carrier: string
  site: string
  customerCountry: string
}

export interface Toolkit {
  id: string
  name: string
  center: string
  domain: string
  pl1: string
  pl2: string
  pl3Code?: string
  pl3Name: string
  combineSubtasksTime: boolean
  enabled?: boolean
  subtasks: Array<{ id: string; name: string; deletedAt: string | null; enabled?: boolean }>
  sharedKpiSelections?: ToolkitSharedKpi[]
}

export interface Pl3Option {
  code: string
  name: string
}

export interface TmsSession {
  id: string
  toolkitId: string
  toolkitName: string
  subtaskId: string | null
  subtaskName: string
  agentName?: string | null
  agentCcgid?: string | null
  processedVolume: number | null
  reference: string
  remarks: string
  status: TmsSessionStatus
  enabled?: boolean
  startedAt: string
  pausedAt: string | null
  endedAt: string | null
  center?: string | null
  domain?: string | null
  pl1?: string | null
  pl2?: string | null
  pl3?: string | null
  pl3Code?: string | null
  carriers?: string[]
  sites?: string[]
  customerCountries?: string[]
  netDurationSeconds: number
}

export interface TeamAgentOption {
  ccgid: string
  name: string
  email?: string | null
}

export type TmsListMode = 'agent' | 'supervisor'

export interface TmsSummary {
  sessionsToday: number
  totalVolume: number
  pausedSessions: number
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface SessionFilters {
  sessionNo?: string
  reference?: string
  query?: string
  dateFrom?: string
  dateTo?: string
  agentCcgid?: string
  toolkitId?: string
  center?: string
  domain?: string
  pl3Code?: string
  carrier?: string
  site?: string
  customerCountry?: string
  enabled?: boolean
  page: number
  pageSize: number
}

export interface SessionDetailsInput {
  subtaskId: string | null
  processedVolume: number | null
  reference: string
  remarks: string
}

export interface StartSessionInput extends SessionDetailsInput {
  toolkitId: string
}

export interface PausedSessionMatch {
  latest: TmsSession | null
  matchCount: number
}

export interface UpdateSessionInput extends SessionDetailsInput {
  id: string
}
