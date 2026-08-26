import type { TooltipComponentOption } from 'echarts/components'

/**
 * Round chart result values to two decimal places.
 * Do not accept a second argument — ECharts axis formatters pass the tick index there.
 */
export function formatChartNumber(value: unknown): string {
  if (value == null || value === '') return ''
  const raw = Array.isArray(value) ? value[0] : value
  const num = Number(raw)
  if (!Number.isFinite(num)) return raw == null ? '' : String(raw)
  return num.toFixed(2)
}

/**
 * ECharts tooltip defaults so the floating layer is not clipped by the chart frame
 * (`overflow: hidden` + in-chart tooltip DOM).
 */
export function floatingTooltip(
  extra: TooltipComponentOption = {},
): TooltipComponentOption {
  const extraCss = [extra.extraCssText, 'z-index: 80; pointer-events: none;']
    .filter(Boolean)
    .join(' ')
  return {
    trigger: 'axis',
    valueFormatter: (value) => formatChartNumber(value),
    ...extra,
    appendTo: 'body',
    confine: false,
    extraCssText: extraCss,
  }
}
