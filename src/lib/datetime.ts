/** Shared date/month display — always `yyyy-MM-dd` / `yyyy-MM`. */

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function fromParts(year: number, month: number, day?: number): string {
  const ym = `${year}-${pad2(month)}`
  return day == null ? ym : `${ym}-${pad2(day)}`
}

/**
 * Formats a date (or datetime) for display as `yyyy-MM-dd`.
 * Pure `yyyy-MM-dd` strings are returned as-is; datetimes use the local calendar date.
 */
export function formatDate(value?: string | Date | null): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    const d = new Date(trimmed)
    if (Number.isNaN(d.getTime())) return '—'
    return fromParts(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }
  if (Number.isNaN(value.getTime())) return '—'
  return fromParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
}

/**
 * Formats a datetime for display as `yyyy-MM-dd HH:mm`.
 */
export function formatDateTime(value?: string | Date | null): string {
  if (value == null || value === '') return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return `${fromParts(d.getFullYear(), d.getMonth() + 1, d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * Formats a datetime for display as `yyyy-MM-dd HH:mm:ss`.
 */
export function formatDateTimeSeconds(value?: string | Date | null): string {
  if (value == null || value === '') return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return `${formatDateTime(d)}:${pad2(d.getSeconds())}`
}

/**
 * Formats a month for display as `yyyy-MM`.
 * Accepts `yyyy-MM`, `yyyy-MM-dd`, datetime strings, or Date.
 */
export function formatMonth(value?: string | Date | null): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const match = /^(\d{4})-(\d{2})/.exec(trimmed)
    if (match) return `${match[1]}-${match[2]}`
    const d = new Date(trimmed)
    if (Number.isNaN(d.getTime())) return '—'
    return fromParts(d.getFullYear(), d.getMonth() + 1)
  }
  if (Number.isNaN(value.getTime())) return '—'
  return fromParts(value.getFullYear(), value.getMonth() + 1)
}

/** Month number 1–12 → `01`…`12` (calendar / month-grid labels). */
export function formatMonthNumber(month: number): string {
  return pad2(month)
}
