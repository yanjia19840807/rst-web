import type { SharedKpiKey } from './types'

export function kpiKey(item: SharedKpiKey) {
  return `${item.carrier}\u0000${item.site}\u0000${item.customerCountry}`
}
