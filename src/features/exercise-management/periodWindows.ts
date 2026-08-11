import { formatDate, formatMonth } from '@/lib/datetime'

export interface SizingWindows {
  monthTrain: string
  monthForecast: string
  dailyTrain: string
  dailyForecast: string
}

export interface DerivedHintLine {
  label: string
  note: string
  value: string
}

export interface SlotKey {
  slotStartAt: string
  slotEndAt: string
}

const SLOT_MINUTES = 30
/** Inclusive start of first slot each day (prototype: 09:00). */
const SLOT_DAY_START_MINUTES = 9 * 60
/** Exclusive end of last slot each day (prototype: 22:00 → last slot 21:30–22:00). */
const SLOT_DAY_END_MINUTES = 22 * 60

function parseYearMonth(ym: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(ym.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year, month }
}

/** Shift a `yyyy-MM` by `delta` months. */
export function shiftYearMonth(ym: string, delta: number): string {
  const parsed = parseYearMonth(ym)
  if (!parsed) return ym
  const index = parsed.year * 12 + (parsed.month - 1) + delta
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return formatMonth(`${year}-${String(month).padStart(2, '0')}`)
}

function monthDayRange(ym: string): string {
  const parsed = parseYearMonth(ym)
  if (!parsed) return '—'
  const last = new Date(parsed.year, parsed.month, 0).getDate()
  const start = `${ym}-01`
  const end = `${ym}-${String(last).padStart(2, '0')}`
  return `${formatDate(start)} – ${formatDate(end)}`
}

export function addDaysIso(iso: string, days: number): string {
  const dt = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return iso
  dt.setDate(dt.getDate() + days)
  return formatDate(dt)
}

/** Prototype: Month train / forecast + Daily train / forecast from Sizing Month. */
export function deriveSizingWindows(sizingMonth: string): SizingWindows {
  if (!parseYearMonth(sizingMonth)) {
    return {
      monthTrain: '—',
      monthForecast: '—',
      dailyTrain: '—',
      dailyForecast: '—',
    }
  }
  return {
    monthTrain: `${formatMonth(shiftYearMonth(sizingMonth, -2))} – ${formatMonth(sizingMonth)}`,
    monthForecast: `${formatMonth(shiftYearMonth(sizingMonth, 1))} – ${formatMonth(shiftYearMonth(sizingMonth, 3))}`,
    dailyTrain: monthDayRange(sizingMonth),
    dailyForecast: monthDayRange(shiftYearMonth(sizingMonth, 1)),
  }
}

/** Resolved slot window: start – end (N week(s)). */
export function deriveSlotPeriodLabel(startDate: string, weeks: number): string {
  const n = Number(weeks)
  if (!startDate || !Number.isFinite(n) || n < 1) return '—'
  const end = addDaysIso(startDate, n * 7 - 1)
  const weekLabel = n === 1 ? '1 week' : `${n} weeks`
  return `${formatDate(startDate)} – ${formatDate(end)} (${weekLabel})`
}

export function sizingHintLines(sizingMonth: string): DerivedHintLine[] {
  const w = deriveSizingWindows(sizingMonth)
  return [
    { label: 'Month train', note: 'Sizing Month + prior 2 months', value: w.monthTrain },
    { label: 'Month forecast', note: 'next 3 months', value: w.monthForecast },
    { label: 'Daily train', note: 'all days in Sizing Month', value: w.dailyTrain },
    { label: 'Daily forecast', note: 'all days in next month', value: w.dailyForecast },
  ]
}

export function slotHintLines(startDate: string, weeks: number): DerivedHintLine[] {
  return [
    {
      label: 'Resolved window',
      note: 'start date + selected weeks',
      value: deriveSlotPeriodLabel(startDate, weeks),
    },
  ]
}

/** Volume Input monthly train keys: sizingMonth-2 … sizingMonth. */
export function monthlyTrainMonths(sizingMonth: string): string[] {
  if (!parseYearMonth(sizingMonth)) return []
  return [-2, -1, 0].map((delta) => shiftYearMonth(sizingMonth, delta))
}

/** Volume Input daily train keys: all days in sizing month. */
export function dailyTrainDates(sizingMonth: string): string[] {
  const parsed = parseYearMonth(sizingMonth)
  if (!parsed) return []
  const last = new Date(parsed.year, parsed.month, 0).getDate()
  const out: string[] = []
  for (let day = 1; day <= last; day++) {
    out.push(`${sizingMonth}-${String(day).padStart(2, '0')}`)
  }
  return out
}

/** Slot training date range end (inclusive). */
export function slotTrainEndDate(startDate: string, weeks: number): string {
  const n = Number(weeks)
  if (!startDate || !Number.isFinite(n) || n < 1) return startDate
  return addDaysIso(startDate, n * 7 - 1)
}

/** Volume Input per-slot train keys: 09:00–22:00 in 30-minute steps (prototype). */
export function slotTrainKeys(startDate: string, weeks: number): SlotKey[] {
  const endDate = slotTrainEndDate(startDate, weeks)
  if (!startDate || !endDate || endDate < startDate) return []
  const out: SlotKey[] = []
  let cur = startDate
  while (cur <= endDate) {
    for (let minutes = SLOT_DAY_START_MINUTES; minutes < SLOT_DAY_END_MINUTES; minutes += SLOT_MINUTES) {
      const startH = Math.floor(minutes / 60)
      const startM = minutes % 60
      const endTotal = minutes + SLOT_MINUTES
      const endH = Math.floor(endTotal / 60)
      const endM = endTotal % 60
      const slotStartAt = `${cur}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00.000Z`
      const endDay = endH === 24 ? addDaysIso(cur, 1) : cur
      const endHour = endH === 24 ? 0 : endH
      const slotEndAt = `${endDay}T${String(endHour).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00.000Z`
      out.push({ slotStartAt, slotEndAt })
    }
    cur = addDaysIso(cur, 1)
  }
  return out
}
