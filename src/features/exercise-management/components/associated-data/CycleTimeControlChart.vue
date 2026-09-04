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
import { useTheme } from '@/composables/useTheme'
import { floatingTooltip, formatChartNumber } from '@/lib/chartTooltip'

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

function themeColor(cssVar: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
  return value || fallback
}

const { theme } = useTheme()

const palette = computed(() => {
  void theme.value
  return {
    daily: themeColor('--foreground', '#14233a'),
    rolling: '#0f6b78',
    limit: themeColor('--destructive', '#da291c'),
    center: '#315f9b',
    border: themeColor('--border', '#d4dde9'),
    outlier: '#d98b16',
  }
})

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
  const colors = palette.value
  if (!data?.points.length) return {}

  const categories = data.points.map((point) => point.date)
  const daily = data.points.map((point) => ({
    value: num(point.dailyMedianSeconds),
    itemStyle: point.outlier ? { color: colors.outlier } : undefined,
  }))
  const rollingValues = data.points.map((point) => num(point.rollingMedianSeconds))
  const center = data.centerSeconds
  const ucl = data.upperControlLimitSeconds
  const lcl = data.lowerControlLimitSeconds

  const limitLines: NonNullable<LineSeriesOption['markLine']>['data'] = []
  if (ucl != null) limitLines.push({ yAxis: num(ucl), name: 'UCL' })
  if (lcl != null) limitLines.push({ yAxis: num(lcl), name: 'LCL' })

  const markLine: LineSeriesOption['markLine'] | undefined =
    limitLines.length > 0
      ? {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 2, color: colors.limit },
          label: { formatter: '{b}', fontSize: 10, color: colors.limit },
          data: limitLines,
        }
      : undefined

  const centerLine: LineSeriesOption['markLine'] | undefined =
    center != null
      ? {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'solid', width: 1.5, color: colors.center },
          label: { formatter: '{b}', fontSize: 10, color: colors.center },
          data: [{ yAxis: num(center), name: 'CL' }],
        }
      : undefined

  return {
    color: [colors.daily, colors.rolling],
    tooltip: floatingTooltip({
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params]
        const date = String(items[0]?.axisValue ?? '')
        const rows = items
          .map((item) => {
            const value = Array.isArray(item.data) ? item.data[1] : item.data
            const raw =
              value && typeof value === 'object' && 'value' in value
                ? (value as { value: unknown }).value
                : value
            return `${item.marker ?? ''}${item.seriesName}: ${formatChartNumber(raw)}s`
          })
          .join('<br/>')
        const extras = [
          center != null ? `CL: ${formatChartNumber(center)}s` : null,
          ucl != null ? `UCL: ${formatChartNumber(ucl)}s` : null,
          lcl != null ? `LCL: ${formatChartNumber(lcl)}s` : null,
        ]
          .filter(Boolean)
          .join('<br/>')
        return extras ? `${date}<br/>${rows}<br/>${extras}` : `${date}<br/>${rows}`
      },
    }),
    legend: { show: false },
    grid: { left: 52, right: 28, top: 20, bottom: 16 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.daily, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      name: 'Seconds',
      splitLine: { lineStyle: { color: colors.border } },
      axisLabel: {
        color: colors.daily,
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
        showSymbol: true,
        lineStyle: { width: 3, color: colors.daily },
        itemStyle: { color: colors.daily },
        emphasis: {
          focus: 'none',
          scale: true,
          lineStyle: { width: 3, color: colors.daily },
          itemStyle: { color: colors.daily },
        },
        blur: {
          lineStyle: { opacity: 1 },
          itemStyle: { opacity: 1 },
        },
        markLine,
      },
      {
        name: 'Rolling median',
        type: 'line',
        data: rollingValues,
        symbol: 'none',
        lineStyle: { width: 2, color: colors.rolling },
        itemStyle: { color: colors.rolling },
        emphasis: {
          focus: 'none',
          lineStyle: { width: 2, color: colors.rolling },
          itemStyle: { color: colors.rolling },
        },
        blur: {
          lineStyle: { opacity: 1 },
          itemStyle: { opacity: 1 },
        },
        markLine: centerLine,
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
      class="h-56 rounded-lg border bg-card"
    />
    <div
      v-else-if="loadError"
      class="flex h-56 items-center justify-center rounded-lg border bg-card px-4 text-center text-sm text-destructive"
    >
      {{ loadError }}
    </div>
    <div
      v-else-if="!hasPoints"
      class="flex h-56 items-center justify-center rounded-lg border bg-card px-4 text-center text-sm text-muted-foreground"
    >
      No included TMS sessions with a valid cycle time.
    </div>
    <div
      v-else
      class="h-56 overflow-hidden rounded-lg border bg-card px-1 pt-2"
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
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block h-2 w-4 rounded-sm" style="background: #315f9b" />
        CL (daily-median)
      </span>
      <span v-if="hasLimits" class="inline-flex items-center gap-1.5">
        <span class="inline-block h-2 w-4 rounded-sm bg-destructive" />
        UCL / LCL (±2σ)
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block size-2 rounded-full" style="background: #d98b16" />
        Outside control limit
      </span>
    </div>
  </div>
</template>
