export type TimesheetSyncFilters = {
  center: string
  kind: string
  status: string
  sourceType: string
  syncDateFrom: string
  syncDateTo: string
}

export function emptyTimesheetSyncFilters(): TimesheetSyncFilters {
  return {
    center: '',
    kind: '',
    status: '',
    sourceType: '',
    syncDateFrom: '',
    syncDateTo: '',
  }
}

export function isMonthlyKind(kind: string) {
  return kind === 'MONTHLY'
}

function monthEnd(yearMonth: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth.trim())
  if (!match) return yearMonth
  const year = Number(match[1])
  const month = Number(match[2])
  return `${match[1]}-${match[2]}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
}

function asMonth(value: string) {
  const match = /^(\d{4})-(\d{2})/.exec(value.trim())
  return match ? `${match[1]}-${match[2]}` : ''
}

export function normalizeKindDates(filters: TimesheetSyncFilters, nextKind: string): TimesheetSyncFilters {
  const monthly = isMonthlyKind(nextKind)
  const wasMonthly = isMonthlyKind(filters.kind)
  if (monthly === wasMonthly) return { ...filters, kind: nextKind }
  return {
    ...filters,
    kind: nextKind,
    syncDateFrom: monthly ? asMonth(filters.syncDateFrom) : filters.syncDateFrom ? `${asMonth(filters.syncDateFrom)}-01` : '',
    syncDateTo: monthly ? asMonth(filters.syncDateTo) : filters.syncDateTo ? monthEnd(asMonth(filters.syncDateTo)) : '',
  }
}

export function toSyncDateRange(filters: TimesheetSyncFilters) {
  if (isMonthlyKind(filters.kind)) {
    return {
      dateFrom: filters.syncDateFrom ? `${filters.syncDateFrom}-01` : undefined,
      dateTo: filters.syncDateTo ? monthEnd(filters.syncDateTo) : undefined,
    }
  }
  return {
    dateFrom: filters.syncDateFrom || undefined,
    dateTo: filters.syncDateTo || undefined,
  }
}

export function matchesSyncDate(syncDate: string | null | undefined, filters: TimesheetSyncFilters) {
  if (!syncDate) return !filters.syncDateFrom && !filters.syncDateTo
  const { dateFrom, dateTo } = toSyncDateRange(filters)
  if (dateFrom && syncDate < dateFrom) return false
  if (dateTo && syncDate > dateTo) return false
  return true
}
