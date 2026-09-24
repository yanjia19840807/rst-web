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
  tms: 'TMS',
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

/** Backend stores 0–1 ratios; UI edits and displays 0–100 percent. */
export function ratioToPercent(ratio: number | null | undefined): number | null {
  if (ratio == null || Number.isNaN(Number(ratio))) return null
  return Math.round(Number(ratio) * 10000) / 100
}

export function percentToRatio(percent: number | null | undefined): number | null {
  if (percent == null || Number.isNaN(Number(percent))) return null
  return Math.round(Number(percent) * 100) / 10000
}

export function formatPercent(ratio: number | null | undefined): string {
  const percent = ratioToPercent(ratio)
  return percent == null ? '—' : formatNumber(percent, 2)
}

export function numOrNull(value: string | number | null | undefined) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
