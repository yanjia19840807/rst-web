/** Positive Right Sizing HC from a completed sizing; otherwise no result. */
export function measuredRightSizingHc(value?: number | string | null): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function formatHc(value?: number | string | null, digits = 1): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(digits)
}

export function formatSigned(value?: number | string | null, digits = 1): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`
}

export function capacityTone(value?: number | string | null): string {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n < 0 ? 'text-destructive font-semibold' : 'text-emerald-600 font-semibold'
}

export function formatMeasuredHc(value?: number | string | null, digits = 1): string {
  return formatHc(measuredRightSizingHc(value), digits)
}

export function formatMeasuredCapacity(
  rightSizingHc?: number | string | null,
  capacity?: number | string | null,
  digits = 1,
): string {
  if (measuredRightSizingHc(rightSizingHc) == null) return '—'
  return formatSigned(capacity, digits)
}

export function measuredCapacityTone(
  rightSizingHc?: number | string | null,
  capacity?: number | string | null,
): string {
  if (measuredRightSizingHc(rightSizingHc) == null) return ''
  return capacityTone(capacity)
}

export type AgingTone = 'bad' | 'warn' | 'neutral'

export function agingTone(days?: number | null): AgingTone {
  if (days == null) return 'neutral'
  if (days >= 5) return 'bad'
  if (days >= 3) return 'warn'
  return 'neutral'
}
