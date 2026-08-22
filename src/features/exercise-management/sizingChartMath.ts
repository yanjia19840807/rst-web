/**
 * Excel Demo 4.0 chart 口径 (Volume per Month / Volume per Day).
 *
 * Monthly: Overcapacity Z, Max Overtime X, Weekdays Overtime V,
 * Max HC Q, Right Size HC, Min HC R, Volume, Volume Forecasted
 * (history months sizingMonth − 2 … sizingMonth plus forecast months).
 * Daily / SLA: Excel Input Full Period — first daily actual through the
 * forecast month, one continuous backlog-aging line (OK / KO by color).
 */

export function n(value: number | string | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Excel Input TotalAgent; falls back to Shared KPI Delivery HC. */
export function actualHeadcount(
  totalAgents: number | string | null | undefined,
  deliveryHc: number | string | null | undefined,
): number {
  const total = n(totalAgents)
  return total > 0 ? total : n(deliveryHc)
}

export function monthKey(value: string): string {
  return value.length >= 7 ? value.slice(0, 7) : value
}

export function dayKey(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value
}

export type MonthlyOtInputs = {
  manualVolume: number
  workdays: number
  weekendDays: number
  cycleTimeSeconds: number
  rightSizingHc: number
  workingHoursPerDay: number
  availabilityRatio: number
  capacityRatio: number
  maxOvertimeMinutes: number
  weekendShiftHc: number
}

/** Excel V / X / Z (FTE). */
export function monthlyOtFte(input: MonthlyOtInputs): {
  weekdaysOvertime: number
  maxOvertime: number
  overcapacity: number
} {
  const simHc = input.rightSizingHc
  const workDays = input.workdays
  const workingHr = input.workingHoursPerDay
  const avail = input.availabilityRatio
  const cap = input.capacityRatio
  const cycle = input.cycleTimeSeconds
  const denomHours = workDays * workingHr * avail * cap
  if (simHc === 0 || cycle <= 0 || denomHours <= 0) {
    return { weekdaysOvertime: 0, maxOvertime: 0, overcapacity: 0 }
  }
  const stdProd = (simHc * denomHours * 3600) / cycle
  const weekendProd =
    (input.weekendShiftHc * input.weekendDays * workingHr * avail * cap * 3600) / cycle
  const produced = stdProd + weekendProd
  const gapFte = ((input.manualVolume - produced) * cycle) / 3600 / denomHours
  const weekdaysOvertime = produced > input.manualVolume ? 0 : gapFte
  const overcapacity = produced < input.manualVolume ? 0 : gapFte
  const maxOvertime =
    workingHr * avail > 0 ? (simHc * input.maxOvertimeMinutes * cap) / 60 / (workingHr * avail) : 0
  return { weekdaysOvertime, maxOvertime, overcapacity }
}

export type DailyAgingRow = {
  holiday: boolean
  workingDay: boolean
  backlogStart: number
  backlogEnd: number
  standardCapacity: number
  overtimeCapacity: number
  manualVolume: number
  month: string
}

/**
 * Excel AB: Backlog Aging in days.
 * AD: Out of SLA when aging &gt; SLATurntime / WorkingHrPerDay.
 */
export function backlogAgingDays(rows: DailyAgingRow[]): number[] {
  const aging: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.backlogEnd === 0) {
      aging.push(0)
      continue
    }
    const prevAging = i === 0 ? 0 : aging[i - 1]
    if (!row.workingDay || row.holiday) {
      aging.push(prevAging)
      continue
    }
    const prodMax = row.standardCapacity + row.overtimeCapacity
    if (row.backlogStart < prodMax) {
      aging.push(1)
      continue
    }
    const cap = prodMax > 0 ? Math.ceil(row.backlogStart / prodMax) : prevAging + 1
    aging.push(Math.min(prevAging + 1, cap))
  }
  return aging
}

/** Excel AC: volume counted out of SLA that day. */
export function backlogOutOfSlaVolume(
  row: DailyAgingRow,
  agingDays: number,
  slaGoal: number,
): number {
  if (agingDays <= slaGoal) return 0
  const prodMax = row.standardCapacity + row.overtimeCapacity
  if (row.backlogStart < prodMax) return row.backlogEnd
  return row.manualVolume
}

/**
 * Excel monthly SLA% = max(0, 1 − Σ Backlog out of SLA / Σ Manual Volume).
 */
export function monthlySlaPercents(
  rows: DailyAgingRow[],
  aging: number[],
  slaGoalDaysValue: number,
): { month: string; slaPct: number }[] {
  const byMonth = new Map<string, { out: number; manual: number }>()
  rows.forEach((row, index) => {
    const bucket = byMonth.get(row.month) ?? { out: 0, manual: 0 }
    bucket.manual += row.manualVolume
    bucket.out += backlogOutOfSlaVolume(row, aging[index] ?? 0, slaGoalDaysValue)
    byMonth.set(row.month, bucket)
  })
  return [...byMonth.keys()].sort().map((month) => {
    const bucket = byMonth.get(month)!
    if (bucket.manual <= 0) return { month, slaPct: 0 }
    return { month, slaPct: Math.max(0, 1 - bucket.out / bucket.manual) * 100 }
  })
}

export function slaGoalDays(
  slaTurnaroundMinutes: number | null | undefined,
  workingHoursPerDay: number | null | undefined,
): number | null {
  const minutes = n(slaTurnaroundMinutes)
  const hours = n(workingHoursPerDay)
  if (minutes <= 0 || hours <= 0) return null
  return minutes / 60 / hours
}
