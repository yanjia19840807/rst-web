export interface TimesheetAlignmentLine {
  carrier: string
  site: string
  customerCountry: string
  missing: boolean
  currentDeliveryHc: number | string | null
}

export interface TimesheetAlignmentView {
  structuralDrift: boolean
  outOfScope: boolean
  currentMonthlySyncDate: string | null
  currentDeliveryHc: number | string | null
  lines: TimesheetAlignmentLine[]
}

export function missingAlignmentLines(alignment?: TimesheetAlignmentView | null) {
  return alignment?.lines.filter((line) => line.missing) ?? []
}

export function formatKpiLine(line: Pick<TimesheetAlignmentLine, 'carrier' | 'site' | 'customerCountry'>) {
  return `${line.carrier} / ${line.site} / ${line.customerCountry}`
}
