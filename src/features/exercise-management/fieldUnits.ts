/**
 * Excel-aligned units for form / table labels.
 * Put the unit on the label; keep the value numeric.
 */
export const FieldUnit = {
  seconds: 's',
  minutes: 'min',
  hours: 'hours',
  days: 'days',
  years: 'years',
  percent: '%',
  hc: 'HC',
  fte: 'FTE',
  transactions: 'transactions',
  shifts: 'shifts',
} as const

export function withUnit(label: string, unit: string): string {
  const suffix = `(${unit})`
  if (label.includes(suffix)) return label
  return `${label} ${suffix}`
}
