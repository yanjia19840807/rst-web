/**
 * Excel Demo 4.0 Volume-per-Slot chart 口径 (chart8).
 *
 * Theoretical FTE: ROUND(manual / (slotMinutes × 60 / cycleTime × availability), 0)
 * Instant TAT: IF(manual = 0, 1, MAX(0, 1 − outOfSla / manual))
 * Cumulative Daily TAT: 1 − (day-to-date outOfSla / day-to-date raw volume), reset at date change
 * Target TAT: Team Setup SLAPercentage
 */

import { dayKey, n } from './sizingChartMath'

export function instantTat(manualVolume: number, volumeOutsideSla: number): number {
  if (manualVolume <= 0) return 1
  return Math.max(0, 1 - volumeOutsideSla / manualVolume)
}

export function cumulativeDailyTat(
  rows: Array<{
    slotStartAt: string
    rawVolume: number
    volumeOutsideSla: number
  } | null>,
): (number | null)[] {
  const out: (number | null)[] = []
  let day = ''
  let cumRaw = 0
  let cumOut = 0
  for (const row of rows) {
    if (!row) {
      out.push(null)
      continue
    }
    const nextDay = dayKey(row.slotStartAt)
    if (nextDay !== day) {
      day = nextDay
      cumRaw = 0
      cumOut = 0
    }
    cumRaw += n(row.rawVolume)
    cumOut += n(row.volumeOutsideSla)
    out.push(cumRaw <= 0 ? 1 : Math.max(0, 1 - cumOut / cumRaw))
  }
  return out
}

/** Excel ROUND(..., 0) on theoretical FTE for the slot chart. */
export function roundedTheoreticalFte(value: number | string | null | undefined): number {
  return Math.round(n(value))
}

export function shiftSeriesName(key: string): string {
  const match = /^shift(\d+)$/i.exec(key)
  if (match) return `Shift ${match[1]} FTE`
  return key
}

export function sortShiftKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const na = Number(/^shift(\d+)$/i.exec(a)?.[1])
    const nb = Number(/^shift(\d+)$/i.exec(b)?.[1])
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
    return a.localeCompare(b)
  })
}
