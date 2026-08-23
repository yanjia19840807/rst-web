export function formatHc(value: number | string | null | undefined, digits = 2): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(digits)
}

export function formatPct(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(1)}%`
}

export function formatSignedPct(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = Number(String(value).replace(/[%+]/g, ''))
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

export function formatVolume(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

export function formatSeconds(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`
}

export function formatCapacity(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function displayOrDash(value: string | null | undefined): string {
  return value && value.trim() ? value : '—'
}
