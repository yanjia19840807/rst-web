export type DomainHeadStatus = 'CONFIGURED' | 'MISSING' | 'STALE'

export type DomainHeadRow = {
  domain: string
  positionId: string | null
  ccgid: string | null
  name: string | null
  status: DomainHeadStatus
}

export type DomainHeadPage = {
  center: string
  dailyAvailable: boolean
  monthlyAvailable: boolean
  remountedCount: number | null
  domains: DomainHeadRow[]
}

export type SaveDomainHeadsRequest = {
  center?: string
  mappings: Array<{
    domain: string
    positionId: string | null
  }>
}
