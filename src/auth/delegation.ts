export const DELEGATION_HEADER = 'X-Rst-Delegation-Id'
export const DELEGATION_STORAGE_KEY = 'rst.delegationId'
export const DELEGATION_ENDED_EVENT = 'rst:delegation-ended'

export function readDelegationId(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(DELEGATION_STORAGE_KEY)
}

export function writeDelegationId(id: string | null) {
  if (typeof sessionStorage === 'undefined') return
  if (id) sessionStorage.setItem(DELEGATION_STORAGE_KEY, id)
  else sessionStorage.removeItem(DELEGATION_STORAGE_KEY)
}

export function notifyDelegationEnded() {
  writeDelegationId(null)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DELEGATION_ENDED_EVENT))
  }
}
