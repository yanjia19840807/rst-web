<script setup lang="ts">
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { ComposeOption } from 'echarts/core'
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'

import type { SlotChartView } from '../types'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
>

const props = defineProps<{
  chart: SlotChartView | null
}>()

const shiftPalette = [
  'hsl(187 70% 70%)',
  'hsl(310 55% 78%)',
  'hsl(45 80% 65%)',
  'hsl(150 45% 55%)',
  'hsl(220 60% 70%)',
]

const hasData = computed(() => (props.chart?.labels?.length ?? 0) > 0)

const option = computed<ChartOption>(() => {
  const chart = props.chart
  if (!chart) return {}

  const labels = chart.labels.map((label) => {
    // ISO instant → HH:mm (or MM-dd HH:mm when multi-day)
    const d = new Date(label)
    if (Number.isNaN(d.getTime())) return label
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  })

  const shiftEntries = Object.entries(chart.shiftFteByKey ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  )
  const stackSeries: BarSeriesOption[] = shiftEntries.map(([key, values], index) => ({
    name: key.startsWith('shift') ? `Shift ${key.replace('shift', '')}` : key,
    type: 'bar',
    stack: 'fte',
    data: values.map((v) => Number(v)),
    itemStyle: { color: shiftPalette[index % shiftPalette.length] },
    barMaxWidth: 18,
    yAxisIndex: 0,
  }))

  return {
    tooltip: { trigger: 'axis' },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: { left: 48, right: 48, top: 24, bottom: 52 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { fontSize: 10, rotate: labels.length > 24 ? 45 : 0 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'FTE',
        splitLine: { lineStyle: { color: 'hsl(var(--border))' } },
      },
      {
        type: 'value',
        name: 'TAT',
        min: 0,
        max: 1,
        axisLabel: {
          formatter: (value: number) => `${Math.round(value * 100)}%`,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      ...stackSeries,
      {
        name: 'Theoretical FTE',
        type: 'line',
        yAxisIndex: 0,
        data: chart.theoreticalFte.map((v) => Number(v)),
        symbol: 'none',
        lineStyle: {
          type: 'dashed',
          width: 1.5,
          color: 'hsl(var(--foreground))',
        },
        itemStyle: { color: 'hsl(var(--foreground))' },
      },
      {
        name: 'Cumulative TAT',
        type: 'line',
        yAxisIndex: 1,
        data: chart.cumulativeTat.map((v) => Number(v)),
        symbol: 'none',
        lineStyle: { width: 3, color: 'hsl(142 60% 28%)' },
        itemStyle: { color: 'hsl(142 60% 28%)' },
      },
    ],
  }
})
</script>

<template>
  <div>
    <h4 class="mb-2.5 text-sm font-bold">Per-Shift FTE Available vs Theoretical FTE Needed</h4>
    <div
      v-if="hasData"
      class="h-56 overflow-hidden rounded-lg border bg-card px-1 pt-2"
    >
      <VChart class="h-full w-full" :option="option" autoresize />
    </div>
    <div
      v-else
      class="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
    >
      No slot chart data.
    </div>
  </div>
</template>
