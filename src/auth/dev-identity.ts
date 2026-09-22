import { isAppRole } from './permissions'

export const DEV_CCGID_HEADER = 'X-Dev-Ccgid'
export const DEV_ROLE_HEADER = 'X-Dev-Role'
export const DEV_CENTER_HEADER = 'X-Dev-Center'
export const DEV_IDENTITY_STORAGE_KEY = 'rst.devIdentity'

export const DEV_QUERY_KEYS = ['ccgid', 'role', 'center'] as const

export type DevIdentity = {
  ccgid?: string
  role?: string
  center?: string
}

function productRole(role?: string) {
  if (!role) return undefined
  const normalized = role.trim().toUpperCase()
  return isAppRole(normalized) ? normalized : undefined
}

/** Used whenever the override switch is on and the tab has not picked another person. */
export const DEFAULT_DEV_IDENTITY = {
  ccgid: 'ADMIN001',
  role: 'ADMIN',
} as const satisfies DevIdentity

export const DEV_DISPLAY_NAMES: Record<string, string> = {
  S00628182: 'YANG Brenda',
  S00661142: 'WU Rongchan',
  S00813982: 'CHEN Cindy',
  S00628202: 'HUANG Hilary',
  S00571942: 'LOO Hui Ping',
}

export function displayNameForCcgid(ccgid: string) {
  const key = ccgid.trim().toUpperCase()
  return DEV_DISPLAY_NAMES[key] || `Dev User ${key}`
}

type QueryValue = string | null | undefined | readonly (string | null)[]

function firstQueryValue(value: QueryValue): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' && item.trim())
    return typeof first === 'string' ? first.trim() : undefined
  }
  return undefined
}

function storage(): Storage | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage
}

/**
 * Last test identity chosen from the URL query string.
 */
export function readDevIdentity(): DevIdentity | null {
  const store = storage()
  const raw = store?.getItem(DEV_IDENTITY_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DevIdentity
    if (!parsed || typeof parsed !== 'object') return null
    const role = productRole(parsed.role)
    if (parsed.role && !role) {
      const next = { ...parsed, role: undefined }
      store?.setItem(DEV_IDENTITY_STORAGE_KEY, JSON.stringify(next))
      return next
    }
    return role && role !== parsed.role ? { ...parsed, role } : parsed
  } catch {
    return null
  }
}

export function writeDevIdentity(identity: DevIdentity | null) {
  const store = storage()
  if (!store) return
  if (!identity || (!identity.ccgid && !identity.role && !identity.center)) {
    store.removeItem(DEV_IDENTITY_STORAGE_KEY)
    return
  }
  store.setItem(DEV_IDENTITY_STORAGE_KEY, JSON.stringify({ ...identity, role: productRole(identity.role) }))
}

export function clearDevIdentity() {
  writeDevIdentity(null)
}

export function mergeDevIdentity(partial: DevIdentity): DevIdentity {
  const current = readDevIdentity() ?? {}
  const next: DevIdentity = { ...current }
  if (partial.ccgid !== undefined) {
    next.ccgid = partial.ccgid.trim() || undefined
  }
  if (partial.role !== undefined) {
    next.role = productRole(partial.role)
  }
  if (partial.center !== undefined) {
    next.center = partial.center.trim() || undefined
  }
  writeDevIdentity(next)
  return next
}

export function captureDevIdentityFromQuery(query: Record<string, unknown>): boolean {
  const ccgid = firstQueryValue(query.ccgid as QueryValue)
  const role = firstQueryValue(query.role as QueryValue)
  const center = firstQueryValue(query.center as QueryValue)
  if (!ccgid && !role && !center) return false
  mergeDevIdentity({
    ...(ccgid ? { ccgid } : {}),
    // A CCGID without a role means every Timesheet seat. Clear a previously pinned role.
    ...(role ? { role } : ccgid ? { role: '' } : {}),
    ...(center ? { center } : {}),
  })
  return true
}

export function captureDevIdentityFromLocation() {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  captureDevIdentityFromQuery({
    ccgid: params.get('ccgid') ?? undefined,
    role: params.get('role') ?? undefined,
    center: params.get('center') ?? undefined,
  })
}

export function stripDevIdentityQuery<T extends Record<string, unknown>>(query: T): T | null {
  const present = DEV_QUERY_KEYS.some((key) => firstQueryValue(query[key] as QueryValue))
  if (!present) return null
  const next = { ...query }
  for (const key of DEV_QUERY_KEYS) {
    delete next[key]
  }
  return next
}

/**
 * Identity the SPA sends on every API call. Stored query/menu values win;
 * otherwise the frontend default is used. The API only honors this when
 * override-enabled is on.
 */
export function resolveDevIdentity(): DevIdentity {
  const stored = readDevIdentity()
  const ccgid = stored?.ccgid?.trim() || DEFAULT_DEV_IDENTITY.ccgid
  const role = productRole(stored?.role)
  const pinnedRole = role || (stored?.ccgid?.trim() ? undefined : DEFAULT_DEV_IDENTITY.role)
  return {
    ccgid,
    ...(pinnedRole ? { role: pinnedRole } : {}),
    ...(stored?.center?.trim() ? { center: stored.center.trim() } : {}),
  }
}

export function applyDevIdentityHeaders(headers: Headers) {
  const identity = resolveDevIdentity()
  if (identity.ccgid) headers.set(DEV_CCGID_HEADER, identity.ccgid)
  if (identity.role) headers.set(DEV_ROLE_HEADER, identity.role)
  if (identity.center) headers.set(DEV_CENTER_HEADER, identity.center)
}
