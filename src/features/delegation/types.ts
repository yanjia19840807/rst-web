import { formatInstantForCenter } from '@/lib/datetime'

export type DelegationStatus = 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED'

export type Delegation = {
  id: string
  delegatorCcgid: string
  delegatorName: string | null
  delegateCcgid: string
  delegateName: string | null
  delegatorRoles: string[]
  delegatorCenter: string | null
  subjectPositionId?: string | null
  assignedByCcgid?: string | null
  assignedByName?: string | null
  validFrom: string | null
  validUntil: string | null
  status: DelegationStatus
  createdAt: string
  endedAt: string | null
}

export type DelegationCandidate = {
  ccgid: string
  name: string
  center: string | null
  email?: string | null
}

export type DelegationCandidatePage = {
  items: DelegationCandidate[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type CreateDelegationRequest = {
  positionId?: string
  delegateCcgids: string[]
  validFrom: string | null
  validUntil: string | null
}

export type PositionAssignment = {
  positionId: string
  roles: string[]
  occupantName: string | null
  occupantCcgid: string | null
  delegations: Delegation[]
}

export type AssignDelegationRequest = {
  positionId: string
  delegateCcgids: string[]
  validFrom: string | null
  validUntil: string | null
}

export function delegationPeriodLabel(
  row: Pick<Delegation, 'validFrom' | 'validUntil' | 'delegatorCenter'>,
) {
  const from = row.validFrom ? formatInstantForCenter(row.validFrom, row.delegatorCenter) : ''
  const until = row.validUntil ? formatInstantForCenter(row.validUntil, row.delegatorCenter) : ''
  if (!from && !until) return 'Ongoing'
  if (!until) return `${from} – Ongoing`
  if (!from) return `Ongoing – ${until}`
  return `${from} – ${until}`
}

export function positionCoverageLabel(row: Pick<Delegation, 'subjectPositionId' | 'delegatorRoles' | 'delegatorName' | 'delegatorCcgid'>) {
  if (!row.subjectPositionId) return row.delegatorName || row.delegatorCcgid
  const roles = row.delegatorRoles.filter(Boolean).join(', ')
  return roles ? `${row.subjectPositionId} · ${roles}` : row.subjectPositionId
}

export function isOpenDelegation(row: Delegation) {
  return row.status === 'PENDING' || row.status === 'ACTIVE'
}
