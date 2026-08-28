export type DelegationStatus = 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED'

export type Delegation = {
  id: string
  delegatorCcgid: string
  delegatorName: string | null
  delegateCcgid: string
  delegateName: string | null
  delegatorRoles: string[]
  delegatorCenter: string | null
  validFrom: string
  validUntil: string
  status: DelegationStatus
  createdAt: string
  endedAt: string | null
}

export type DelegationCandidate = {
  ccgid: string
  name: string
  center: string | null
}

export type DelegationCandidatePage = {
  items: DelegationCandidate[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type CreateDelegationRequest = {
  delegateCcgid: string
  validFrom: string
  validUntil: string
}

export function isOpenDelegation(row: Delegation) {
  return row.status === 'PENDING' || row.status === 'ACTIVE'
}
