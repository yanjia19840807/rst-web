/** Weekend patterns aligned with backend WeekendCode / NETWORKDAYS.INTL. */
const WEEKEND_DAYS: Record<string, ReadonlySet<number>> = {
  SAT_SUN: new Set([6, 0]), // Sat, Sun (JS getDay)
  SUN_ONLY: new Set([0]),
  FRI_SAT: new Set([5, 6]),
  NONE: new Set(),
}

/**
 * Counts working days in a calendar year excluding weekends and holiday dates.
 * Mirrors backend WorkingDaysCalculator.networkDays.
 */
export function computeNetworkDays(
  year: number,
  weekendCode: string | null | undefined,
  holidayDates: readonly string[],
): number {
  const weekend = WEEKEND_DAYS[weekendCode?.trim().toUpperCase() ?? ''] ?? WEEKEND_DAYS.SAT_SUN
  const nonWorking = new Set(
    holidayDates.filter((date) => date && date.startsWith(`${year}-`)),
  )
  let count = 0
  const cursor = new Date(Date.UTC(year, 0, 1))
  const end = Date.UTC(year, 11, 31)
  while (cursor.getTime() <= end) {
    const iso = cursor.toISOString().slice(0, 10)
    const dow = cursor.getUTCDay()
    if (!weekend!.has(dow) && !nonWorking.has(iso)) {
      count++
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count
}
