import type { TooltipComponentOption } from 'echarts/components'

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
    ...extra,
    appendTo: 'body',
    confine: false,
    extraCssText: extraCss,
  }
}
