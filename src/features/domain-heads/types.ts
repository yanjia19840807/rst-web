export type DomainHeadStatus = 'CONFIGURED' | 'MISSING' | 'STALE'

export type CenterRoleAssignee = {
  positionId: string | null
  ccgid: string | null
  name: string | null
  status: DomainHeadStatus
}

export type DomainHeadAssignee = CenterRoleAssignee

export type DomainHeadRow = {
  domain: string
  assignees: DomainHeadAssignee[]
  status: DomainHeadStatus
}

export type DomainHeadPage = {
  center: string
  dailyAvailable: boolean
  monthlyAvailable: boolean
  remountedCount: number | null
  lth: CenterRoleAssignee
  domains: DomainHeadRow[]
}

export type SaveDomainHeadsRequest = {
  center?: string
  lthPositionId?: string | null
  mappings: Array<{
    domain: string
    positionIds: string[]
  }>
}
