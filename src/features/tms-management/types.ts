export type TmsSessionStatus = 'running' | 'paused' | 'completed' | 'discarded'

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
  subtasks: Array<{ id: string; name: string; deletedAt: string | null }>
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
  startedAt: string
  pausedAt: string | null
  endedAt: string | null
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
  pl3Code?: string
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
