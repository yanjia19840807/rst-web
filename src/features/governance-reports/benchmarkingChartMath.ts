/** Peak-relative bar heights so four Benchmarking metrics can share one axis. */

export function toChartNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Scales each value to ±100 against the largest absolute value in the set.
 * Nulls stay null. An all-zero set stays 0.
 */
export function relativeToPeak(values: Array<number | null>): Array<number | null> {
  let peak = 0
  for (const value of values) {
    if (value == null) continue
    peak = Math.max(peak, Math.abs(value))
  }
  if (peak === 0) {
    return values.map((value) => (value == null ? null : 0))
  }
  return values.map((value) =>
    value == null ? null : Math.round((value / peak) * 1000) / 10,
  )
}

/**
 * Independent radar axis for one metric. Capacity Creation may start below zero.
 */
export function radarAxisScale(
  values: Array<number | null>,
  options: { allowNegative?: boolean } = {},
): { min: number; max: number } {
  let min = 0
  let max = 0
  let any = false
  for (const value of values) {
    if (value == null) continue
    if (!any) {
      min = value
      max = value
      any = true
      continue
    }
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (!any) {
    return { min: 0, max: 1 }
  }
  if (options.allowNegative && min < 0) {
    const floor = min * 1.1
    const ceil = max > 0 ? max * 1.1 : 0
    return { min: floor, max: ceil === floor ? floor + 1 : ceil }
  }
  const ceil = max === 0 ? 1 : max * 1.1
  return { min: 0, max: ceil }
}
