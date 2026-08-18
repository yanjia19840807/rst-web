<script setup lang="ts">
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { ComposeOption } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'

import ListLoading from '@/components/ListLoading.vue'

import { useCycleTimeChartQuery } from '../../api/queries'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
])

type ChartOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption | LegendComponentOption
>

const props = defineProps<{
  exerciseId: string
}>()

const chartQuery = useCycleTimeChartQuery(() => props.exerciseId)
const chart = computed(() => chartQuery.data.value ?? null)
const loading = computed(() => chartQuery.isPending.value && !chart.value)
const loadError = computed(() => {
  if (!chartQuery.isError.value) return null
  return chartQuery.error.value instanceof Error
    ? chartQuery.error.value.message
    : 'Could not load the control chart.'
})

const destructive = 'hsl(var(--destructive))'
const foreground = 'hsl(var(--foreground))'
const rolling = '#0f6b78'
const border = 'hsl(var(--border))'
const outlier = 'hsl(32 90% 48%)'

const hasPoints = computed(() => (chart.value?.points.length ?? 0) > 0)
const hasLimits = computed(
  () =>
    chart.value?.upperControlLimitSeconds != null &&
    chart.value?.lowerControlLimitSeconds != null,
)

function num(value: number | string | null | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const option = computed<ChartOption>(() => {
  const data = chart.value
  if (!data?.points.length) return {}

  const categories = data.points.map((point) => point.date)
  const daily = data.points.map((point) => ({
    value: num(point.dailyMedianSeconds),
    itemStyle: point.outlier ? { color: outlier } : { color: foreground },
  }))
  const rolling = data.points.map((point) => num(point.rollingMedianSeconds))
  const ucl = data.upperControlLimitSeconds
  const lcl = data.lowerControlLimitSeconds

  const markLine: LineSeriesOption['markLine'] =
    ucl != null && lcl != null
      ? {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 2, color: destructive },
          label: { formatter: '{b}', fontSize: 10, color: destructive },
          data: [
            { yAxis: num(ucl), name: 'UCL' },
            { yAxis: num(lcl), name: 'LCL' },
          ],
        }
      : undefined

  return {
    color: [foreground, rolling],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${Number(value).toFixed(2)}s`,
    },
    legend: { show: false },
    grid: { left: 52, right: 24, top: 16, bottom: 16 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: border } },
      axisLabel: { color: foreground, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      name: 'Seconds',
      splitLine: { lineStyle: { color: border } },
      axisLabel: {
        color: foreground,
        fontSize: 11,
        formatter: (value: number) => `${value}`,
      },
    },
    series: [
      {
        name: 'Daily median',
        type: 'line',
        data: daily,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: foreground },
        itemStyle: { color: foreground },
        markLine,
      },
      {
        name: 'Rolling median',
        type: 'line',
        data: rolling,
        symbol: 'none',
        lineStyle: { width: 2, color: rolling },
        itemStyle: { color: rolling },
      },
    ],
  }
})
</script>

<template>
  <div>
    <h3 class="mb-2 text-sm font-bold">Cycle Time Control Chart</h3>
    <ListLoading
      v-if="loading"
      class="h-44 rounded-lg border bg-card"
    />
    <div
      v-else-if="loadError"
      class="flex h-44 items-center justify-center rounded-lg border bg-card px-4 text-center text-sm text-destructive"
    >
      {{ loadError }}
    </div>
    <div
      v-else-if="!hasPoints"
      class="flex h-44 items-center justify-center rounded-lg border bg-card px-4 text-center text-sm text-muted-foreground"
    >
      No included TMS sessions with a valid cycle time. Include sessions with volume to plot the
      chart.
    </div>
    <div
      v-else
      class="h-44 overflow-hidden rounded-lg border bg-card px-1 pt-2"
    >
      <VChart class="h-full w-full" :option="option" autoresize />
    </div>
    <p v-if="hasPoints && !hasLimits" class="mt-2 text-xs text-muted-foreground">
      Control limits need at least two days of included samples.
    </p>
    <div v-else-if="hasPoints" class="mt-2.5 flex flex-wrap gap-3.5 text-xs text-muted-foreground">
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block h-2 w-4 rounded-sm bg-foreground" />
        Daily median
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block h-2 w-4 rounded-sm" style="background: #0f6b78" />
        Rolling median (7 days)
      </span>
      <span v-if="hasLimits" class="inline-flex items-center gap-1.5">
        <span class="inline-block h-2 w-4 rounded-sm bg-destructive" />
        Control limit (±2σ)
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block size-2 rounded-full" style="background: hsl(32 90% 48%)" />
        Outside control limit
      </span>
    </div>
  </div>
</template>
