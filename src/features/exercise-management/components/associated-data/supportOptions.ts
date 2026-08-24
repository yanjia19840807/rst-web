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
): number | null {
  switch (frequencyCode.trim().toUpperCase()) {
    case 'DAILY':
    case 'DAY':
      return workingDaysPerYear != null && workingDaysPerYear > 0 ? workingDaysPerYear : null
    case 'WEEKLY':
    case 'WEEK':
      return 52
    case 'MONTHLY':
    case 'MONTH':
      return 12
    default:
      return null
  }
}

/** Hours/year = Volume × Mins/unit × Multiplier / 60 */
export function hoursPerYear(
  volume: number | null,
  minsPerUnit: number | null,
  multiplier: number | null,
): number | null {
  if (volume == null || minsPerUnit == null || multiplier == null) return null
  return Math.round(((volume * minsPerUnit * multiplier) / 60) * 1e6) / 1e6
}

/**
 * BRD FTE denominator: WorkingHr × Availability × WorkingDays × CapacityRatio.
 * Returns null when Team Setup is incomplete.
 */
export function fteAnnualHours(input: {
  workingHoursPerDay?: number | null
  availabilityRatio?: number | null
  workingDaysPerYear?: number | null
  capacityRatio?: number | null
}): number | null {
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
    return null
  }
  return hours * availability * workingDays * capacity
}

export function supportFte(
  hoursYear: number | null,
  annualHours: number | null,
): number | null {
  if (hoursYear == null || annualHours == null || annualHours <= 0) return null
  return Math.round((hoursYear / annualHours) * 1e6) / 1e6
}

export function sumSupportFte(items: readonly { supportFte: number | null }[]): number | null {
  if (!items.length) return 0
  let total = 0
  for (const item of items) {
    if (item.supportFte == null) return null
    total += item.supportFte
  }
  return total
}
