/** Shared date/month display — civil fields stay literal; Instants use a Center zone. */

import { resolveContextTimeZone, zoneIdForCenter } from '@/lib/centerZones'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function fromParts(year: number, month: number, day?: number): string {
  const ym = `${year}-${pad2(month)}`
  return day == null ? ym : `${ym}-${pad2(day)}`
}

function isCivilDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

function isCivilDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value.trim())
}

function civilDateTimeParts(value: string): { date: string; time: string } | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/.exec(value.trim())
  if (!match) return null
  return { date: match[1], time: match[2] }
}

/**
 * Formats a civil date as `yyyy-MM-dd`. Instant strings must use {@link formatInstant}.
 */
export function formatCivilDate(value?: string | null): string {
  if (value == null || value === '') return '—'
  const trimmed = value.trim()
  if (isCivilDate(trimmed)) return trimmed
  const parts = civilDateTimeParts(trimmed)
  if (parts) return parts.date
  return '—'
}

/**
 * Formats a civil datetime (`yyyy-MM-ddTHH:mm[:ss]`, no offset) as `yyyy-MM-dd HH:mm`.
 */
export function formatCivilDateTime(value?: string | null): string {
  if (value == null || value === '') return '—'
  const parts = civilDateTimeParts(value)
  if (!parts) return formatCivilDate(value)
  return `${parts.date} ${parts.time}`
}

/**
 * Formats an Instant ISO string in the given IANA timezone.
 */
export function formatInstant(
  value?: string | Date | null,
  timeZone?: string,
  options?: { seconds?: boolean; zoneLabel?: boolean },
): string {
  if (value == null || value === '') return '—'
  const iso = typeof value === 'string' ? value.trim() : value.toISOString()
  if (!iso) return '—'
  const zone = timeZone && timeZone.trim() !== '' ? timeZone : null
  if (zone == null) return '—'
  const d = typeof value === 'string' ? new Date(iso) : value
  if (Number.isNaN(d.getTime())) return '—'
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: options?.seconds ? '2-digit' : undefined,
    hourCycle: 'h23',
  }).formatToParts(d)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  const formatted = options?.seconds
    ? `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')}`
    : `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}`
  if (options?.zoneLabel === false) return formatted
  const abbrev = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    timeZoneName: 'short',
  })
    .formatToParts(d)
    .find((part) => part.type === 'timeZoneName')?.value
  return abbrev ? `${formatted} ${abbrev}` : formatted
}

/**
 * Instant formatted with a GBS Center's IANA zone.
 */
export function formatInstantForCenter(
  value?: string | Date | null,
  center?: string | null,
  options?: { seconds?: boolean; zoneLabel?: boolean },
): string {
  if (value == null || value === '') return '—'
  try {
    return formatInstant(value, zoneIdForCenter(center), options)
  } catch {
    try {
      return formatInstant(value, resolveContextTimeZone(center), options)
    } catch {
      return '—'
    }
  }
}

/**
 * @deprecated Prefer {@link formatCivilDate} or {@link formatInstantForCenter}.
 * Pure `yyyy-MM-dd` and civil datetimes stay literal; offset timestamps are not converted here.
 */
export function formatDate(value?: string | Date | null): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (isCivilDate(trimmed) || isCivilDateTime(trimmed)) return formatCivilDate(trimmed)
    return '—'
  }
  if (Number.isNaN(value.getTime())) return '—'
  return fromParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
}

/**
 * @deprecated Prefer {@link formatCivilDateTime} or {@link formatInstantForCenter}.
 */
export function formatDateTime(value?: string | Date | null): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string' && isCivilDateTime(value.trim())) {
    return formatCivilDateTime(value)
  }
  return '—'
}

/**
 * @deprecated Prefer {@link formatInstant} with `seconds: true`.
 */
export function formatDateTimeSeconds(value?: string | Date | null): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string' && isCivilDateTime(value.trim())) {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(value.trim())
    return match ? `${match[1]} ${match[2]}` : formatCivilDateTime(value)
  }
  return '—'
}

/**
 * Formats a month for display as `yyyy-MM`.
 */
export function formatMonth(value?: string | Date | null): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const match = /^(\d{4})-(\d{2})/.exec(trimmed)
    if (match) return `${match[1]}-${match[2]}`
    return '—'
  }
  if (Number.isNaN(value.getTime())) return '—'
  return fromParts(value.getFullYear(), value.getMonth() + 1)
}

/** Month number 1–12 → `01`…`12` (calendar / month-grid labels). */
export function formatMonthNumber(month: number): string {
  return pad2(month)
}

/** Civil `yyyy-MM-dd` for “today” in an IANA zone. */
export function formatToday(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('year')}-${pick('month')}-${pick('day')}`
}
