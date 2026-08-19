export const SUPPORT_FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
] as const

export const SUPPORT_UOMS = [
  'Cases',
  'Packs',
  'Queries',
  'Sessions',
  'Emails',
  'Tickets',
  'Calls',
  'Documents',
  'Hours',
  'Other',
] as const

/** BRD: Daily → WorkingDays; Weekly → 52; Monthly → 12. */
export function annualMultiplier(
  frequencyCode: string,
  workingDaysPerYear: number | null | undefined,
): number {
  switch (frequencyCode.trim().toUpperCase()) {
    case 'DAILY':
    case 'DAY':
      return workingDaysPerYear != null && workingDaysPerYear > 0 ? workingDaysPerYear : 261
    case 'WEEKLY':
    case 'WEEK':
      return 52
    case 'MONTHLY':
    case 'MONTH':
      return 12
    default:
      return 12
  }
}

/** Hours/year = Volume × Mins/unit × Multiplier / 60 */
export function hoursPerYear(
  volume: number | null,
  minsPerUnit: number | null,
  multiplier: number,
): number | null {
  if (volume == null || minsPerUnit == null) return null
  return Math.round(((volume * minsPerUnit * multiplier) / 60) * 1e6) / 1e6
}

/**
 * BRD FTE denominator: WorkingHr × Availability × WorkingDays × CapacityRatio.
 * Falls back to 2080 when Team Setup is incomplete.
 */
export function fteAnnualHours(input: {
  workingHoursPerDay?: number | null
  availabilityRatio?: number | null
  workingDaysPerYear?: number | null
  capacityRatio?: number | null
}): number {
  const hours = input.workingHoursPerDay
  const availability = input.availabilityRatio
  const workingDays = input.workingDaysPerYear
  const capacity = input.capacityRatio
  if (
    hours == null ||
    availability == null ||
    workingDays == null ||
    capacity == null ||
    hours <= 0 ||
    availability <= 0 ||
    workingDays <= 0 ||
    capacity <= 0
  ) {
    return 2080
  }
  return hours * availability * workingDays * capacity
}

export function supportFte(hoursYear: number | null, annualHours: number): number | null {
  if (hoursYear == null || annualHours <= 0) return null
  return Math.round((hoursYear / annualHours) * 1e6) / 1e6
}
