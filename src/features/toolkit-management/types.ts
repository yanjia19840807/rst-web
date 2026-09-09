import type { TimesheetAlignmentView } from '@/features/timesheet-alignment/types'

export interface ToolkitSubtask {
  id: string
  name: string
  description: string | null
  displayOrder: number
  deletedAt: string | null
  enabled?: boolean
  referencedEnabledSessionCount?: number
  referencedDisabledSessionCount?: number
}

export interface SharedKpiKey {
  carrier: string
  site: string
  customerCountry: string
}

export interface SharedKpiCandidate extends SharedKpiKey {
  deliveryHc: number
}

export interface SupervisorToolkit {
  id: string
  name: string
  description: string | null
  supervisorPositionId: string
  center: string
  domain: string
  pl1: string
  pl2: string
  pl3Code: string
  pl3Name: string
  combineSubtasksTime: boolean
  subtasks: ToolkitSubtask[]
  sharedKpiSelections: SharedKpiKey[]
  version: number
  deletedAt: string | null
  enabled?: boolean
  referencedEnabledSessionCount?: number
  referencedDisabledSessionCount?: number
  syncedSessionCount?: number
  outOfSync?: boolean
  alignment?: TimesheetAlignmentView | null
}

export interface HierarchyOption {
  supervisorPositionId: string
  center: string
  domain: string
  pl1: string
  pl2: string
  pl3Code: string
  pl3Name: string
}

export interface ToolkitEditorPayload {
  name: string
  description: string
  supervisorPositionId: string
  center: string
  domain: string
  pl1: string
  pl2: string
  pl3Code: string
  pl3Name: string
  combineSubtasksTime: boolean
  subtasks: ToolkitSubtask[]
  sharedKpiSelections: SharedKpiKey[]
  version?: number
}

export interface ToolkitListQuery {
  name?: string
  pl3Name?: string
  enabled?: boolean
  page?: number
  pageSize?: number
}

export interface ToolkitListView {
  items: SupervisorToolkit[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  pl3Names: string[]
}
