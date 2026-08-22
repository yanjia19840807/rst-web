export type AdTab = 'team' | 'tms' | 'support' | 'calendar' | 'volume'

export type MedianSourceMode = 'system' | 'manual'

export const AD_TAB_LABELS: Record<AdTab, string> = {
  team: 'Team Setup',
  tms: 'TMS',
  support: 'Production Support',
  calendar: 'Calendar',
  volume: 'Volume Input',
}

export const AD_EDITOR_TITLES: Record<AdTab, string> = {
  team: 'Team Setup',
  tms: 'Embedded TMS',
  support: 'Production Support',
  calendar: 'Calendar',
  volume: 'Volume Input',
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export function numOrNull(value: string | number | null | undefined) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
