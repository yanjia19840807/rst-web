/** Excel NETWORKDAYS.INTL weekend codes (1–7, 11–17). */
export const DEFAULT_WEEKEND_CODE = '1'

export const WEEKEND_CODE_OPTIONS = [
  { value: '1', label: '1 — Saturday, Sunday' },
  { value: '2', label: '2 — Sunday, Monday' },
  { value: '3', label: '3 — Monday, Tuesday' },
  { value: '4', label: '4 — Tuesday, Wednesday' },
  { value: '5', label: '5 — Wednesday, Thursday' },
  { value: '6', label: '6 — Thursday, Friday' },
  { value: '7', label: '7 — Friday, Saturday' },
  { value: '11', label: '11 — Sunday' },
  { value: '12', label: '12 — Monday' },
  { value: '13', label: '13 — Tuesday' },
  { value: '14', label: '14 — Wednesday' },
  { value: '15', label: '15 — Thursday' },
  { value: '16', label: '16 — Friday' },
  { value: '17', label: '17 — Saturday' },
] as const

export type WeekendCodeValue = (typeof WEEKEND_CODE_OPTIONS)[number]['value']

/** Excel PH Dates Type values. */
export const HOLIDAY_TYPE_OPTIONS = [
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'WEEKEND', label: 'Weekend' },
  { value: 'NORMAL', label: 'Normal' },
] as const

export type HolidayTypeValue = (typeof HOLIDAY_TYPE_OPTIONS)[number]['value']

const JS_DAYS: Record<string, ReadonlySet<number>> = {
  '1': new Set([6, 0]),
  SAT_SUN: new Set([6, 0]),
  SATURDAY_SUNDAY: new Set([6, 0]),
  '2': new Set([0, 1]),
  '3': new Set([1, 2]),
  '4': new Set([2, 3]),
  '5': new Set([3, 4]),
  '6': new Set([4, 5]),
  '7': new Set([5, 6]),
  FRI_SAT: new Set([5, 6]),
  FRIDAY_SATURDAY: new Set([5, 6]),
  '11': new Set([0]),
  SUN_ONLY: new Set([0]),
  SUNDAY_ONLY: new Set([0]),
  '12': new Set([1]),
  '13': new Set([2]),
  '14': new Set([3]),
  '15': new Set([4]),
  '16': new Set([5]),
  '17': new Set([6]),
}

export function weekendDays(code: string | null | undefined): ReadonlySet<number> | null {
  if (code == null || code.trim() === '') return null
  const key = code.trim().toUpperCase()
  return JS_DAYS[key] ?? null
}

export function weekendCodeLabel(code: string | null | undefined): string {
  if (!code) return '—'
  const match = WEEKEND_CODE_OPTIONS.find((option) => option.value === String(code).trim())
  if (match) return match.label
  const days = weekendDays(code)
  if (!days) return String(code)
  const known = WEEKEND_CODE_OPTIONS.find((option) => {
    const optionDays = weekendDays(option.value)
    return optionDays != null
      && optionDays.size === days.size
      && [...optionDays].every((day) => days.has(day))
  })
  return known?.label ?? String(code)
}

export function normalizeWeekendCode(code: string | null | undefined): string {
  const match = WEEKEND_CODE_OPTIONS.find((option) => option.value === String(code ?? '').trim())
  if (match) return match.value
  const days = weekendDays(code)
  if (!days) return ''
  const known = WEEKEND_CODE_OPTIONS.find((option) => {
    const optionDays = weekendDays(option.value)
    return optionDays != null
      && optionDays.size === days.size
      && [...optionDays].every((day) => days.has(day))
  })
  return known?.value ?? ''
}

export function holidayTypeLabel(type: string | null | undefined): string {
  const token = (type ?? '').trim().toUpperCase()
  const match = HOLIDAY_TYPE_OPTIONS.find((option) => option.value === token)
  if (match) return match.label
  if (token === 'WEEKEND') return 'Weekend'
  if (token === 'NORMAL') return 'Normal'
  return 'Holiday'
}

export function normalizeHolidayType(type: string | null | undefined): HolidayTypeValue {
  const token = (type ?? '').trim().toUpperCase()
  if (token === 'WEEKEND') return 'WEEKEND'
  if (token === 'NORMAL') return 'NORMAL'
  return 'HOLIDAY'
}

export function countHolidayTypes(
  holidays: ReadonlyArray<{ holidayType?: string | null }>,
) {
  let rest = 0
  let makeup = 0
  for (const row of holidays) {
    if (normalizeHolidayType(row.holidayType) === 'NORMAL') makeup += 1
    else rest += 1
  }
  return { rest, makeup, total: holidays.length }
}
