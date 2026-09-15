import { computed } from 'vue'

import { useSessionStore } from '@/auth/session'
import { useCenterCatalogStore } from '@/catalog/centerCatalog'
import { resolveContextTimeZone } from '@/lib/centerZones'

/**
 * DatePicker / “today” zone: record or identity Center, else the catalog default.
 */
export function useContextTimeZone(center?: () => string | null | undefined) {
  const session = useSessionStore()
  const catalog = useCenterCatalogStore()
  return computed(() => {
    try {
      return resolveContextTimeZone(center?.() ?? session.user?.center)
    } catch {
      return catalog.defaultTimeZone ?? ''
    }
  })
}
