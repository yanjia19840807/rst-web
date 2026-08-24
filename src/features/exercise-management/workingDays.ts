import { weekendDays } from './weekendCodes'

/**
 * Counts working days in a calendar year excluding weekends and holiday dates.
 * Mirrors backend WorkingDaysCalculator.networkDays / Excel NETWORKDAYS.INTL.
 */
export function computeNetworkDays(
  year: number,
  weekendCode: string | null | undefined,
  holidayDates: readonly string[] = [],
): number | null {
  const weekend = weekendDays(weekendCode)
  if (!weekend) return null
  const nonWorking = new Set(
    holidayDates.filter((date) => date && date.startsWith(`${year}-`)),
  )
  let count = 0
  const cursor = new Date(Date.UTC(year, 0, 1))
  const end = Date.UTC(year, 11, 31)
  while (cursor.getTime() <= end) {
    const iso = cursor.toISOString().slice(0, 10)
    const dow = cursor.getUTCDay()
    if (!weekend.has(dow) && !nonWorking.has(iso)) {
      count++
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count
}
