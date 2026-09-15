/** Lookups against the backend Center catalog held in the catalog store snapshot. */

import { readCenterCatalog } from '@/catalog/centerCatalog'

function catalog() {
  return readCenterCatalog()
}

export function canonicalizeCenter(center?: string | null): string | null {
  if (center == null || center.trim() === '') return null
  const trimmed = center.trim().toUpperCase()
  return catalog().find((entry) => entry.center.toUpperCase() === trimmed)?.center ?? null
}

/**
 * IANA zone for a known Center. Throws so callers never silently use the browser zone.
 */
export function zoneIdForCenter(center?: string | null): string {
  const canonical = canonicalizeCenter(center)
  const match = catalog().find((entry) => entry.center === canonical)
  if (match == null) {
    throw new Error(`No IANA timezone is configured for Center: ${center ?? '(empty)'}`)
  }
  return match.timeZone
}

/**
 * Display / DatePicker zone: identity or record Center, else the catalog default.
 */
export function resolveContextTimeZone(center?: string | null): string {
  const canonical = canonicalizeCenter(center)
  if (canonical != null) return zoneIdForCenter(canonical)
  const fallback = catalog()[0]
  if (fallback == null) {
    throw new Error('Center catalog is not loaded')
  }
  return fallback.timeZone
}
