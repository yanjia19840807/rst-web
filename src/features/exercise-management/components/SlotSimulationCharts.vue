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

import { n } from '../sizingChartMath'
import {
  cumulativeDailyTat,
  instantTat,
  roundedTheoreticalFte,
  shiftSeriesName,
  sortShiftKeys,
} from '../slotChartMath'
import type { SlotRowView, SlotSimulationView } from '../types'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
>

type LegendItem = {
  name: string
  color: string
  kind: 'bar' | 'solid' | 'dashed'
}

const props = defineProps<{
  simulation: SlotSimulationView | null
}>()

function themeColor(cssVar: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
  return value || fallback
}

const palette = computed(() => {
  const chart = [
    themeColor('--chart-1', '#071d49'),
    themeColor('--chart-2', '#315f9b'),
    themeColor('--chart-3', '#79a6d2'),
    themeColor('--chart-4', '#da291c'),
    themeColor('--chart-5', '#4e7d69'),
  ]
  return {
    chart,
    theoretical: themeColor('--foreground', '#14233a'),
    target: themeColor('--chart-4', '#da291c'),
    cumulative: themeColor('--chart-5', '#4e7d69'),
    instant: themeColor('--chart-2', '#315f9b'),
    axis: themeColor('--foreground', '#14233a'),
    border: themeColor('--border', '#d4dde9'),
  }
})

const hasData = computed(() => (props.simulation?.chart?.labels?.length ?? 0) > 0)

function alignedRows(labels: string[], rows: SlotRowView[]): Array<SlotRowView | null> {
  if (!rows.length) return labels.map(() => null)
  const sorted = [...rows].sort((a, b) => a.slotStartAt.localeCompare(b.slotStartAt))
  if (sorted.length === labels.length) return sorted
  const byStart = new Map(sorted.map((row) => [row.slotStartAt, row]))
  return labels.map((label) => byStart.get(label) ?? null)
}

function formatSlotLabel(label: string, multiDay: boolean): string {
  const d = new Date(label)
  if (Number.isNaN(d.getTime())) return label
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (!multiDay) return `${hh}:${mm}`
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}-${day} ${hh}:${mm}`
}

const percentTooltip = {
  valueFormatter: (value: number | string) => `${(Number(value) * 100).toFixed(1)}%`,
}

const option = computed<ChartOption>(() => {
  const chart = props.simulation?.chart
  if (!chart) return {}
  const colors = palette.value
  const labels = chart.labels
  const days = new Set(labels.map((label) => label.slice(0, 10)))
  const axisLabels = labels.map((label) => formatSlotLabel(label, days.size > 1))
  const rows = alignedRows(labels, props.simulation?.rows ?? [])

  const shiftKeys = sortShiftKeys(Object.keys(chart.shiftFteByKey ?? {}))
  const stackSeries: BarSeriesOption[] = shiftKeys.map((key, index) => ({
    name: shiftSeriesName(key),
    type: 'bar',
    stack: 'fte',
    data: (chart.shiftFteByKey[key] ?? []).map((v) => n(v)),
    itemStyle: { color: colors.chart[index % colors.chart.length] },
    barMaxWidth: 18,
    yAxisIndex: 0,
  }))

  const hasRowData = rows.some(Boolean)
  const theoretical = hasRowData
    ? rows.map((row) => (row ? roundedTheoreticalFte(row.theoreticalFte) : null))
    : chart.theoreticalFte.map((v) => roundedTheoreticalFte(v))

  const target = n(props.simulation?.slaTargetRatio)
  const hasTarget = props.simulation?.slaTargetRatio != null
  const instant = hasRowData
    ? rows.map((row) =>
        row ? instantTat(n(row.manualVolume), n(row.volumeOutsideSla)) : null,
      )
    : labels.map(() => null)
  const cumulative = hasRowData
    ? cumulativeDailyTat(
        rows.map((row) =>
          row
            ? {
                slotStartAt: row.slotStartAt,
                rawVolume: n(row.rawVolume),
                volumeOutsideSla: n(row.volumeOutsideSla),
              }
            : null,
        ),
      )
    : chart.cumulativeTat.map((v) => n(v))

  const tatLine = (
    name: string,
    data: (number | null)[],
    color: string,
    dashed = false,
    width = 2,
  ): LineSeriesOption => ({
    name,
    type: 'line',
    yAxisIndex: 1,
    data,
    symbol: 'none',
    z: 10,
    tooltip: percentTooltip,
    lineStyle: { width, color, type: dashed ? 'dashed' : 'solid' },
    itemStyle: { color },
  })

  return {
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    grid: { left: 48, right: 56, top: 28, bottom: 16 },
    xAxis: {
      type: 'category',
      data: axisLabels,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: {
        color: colors.axis,
        fontSize: 10,
        rotate: axisLabels.length > 24 ? 45 : 0,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'FTE',
        splitLine: { lineStyle: { color: colors.border } },
        axisLabel: { color: colors.axis, fontSize: 11 },
      },
      {
        type: 'value',
        name: 'TAT Ratio',
        min: 0,
        max: 1,
        splitLine: { show: false },
        axisLabel: {
          color: colors.axis,
          fontSize: 11,
          formatter: (value: number) => `${Math.round(value * 100)}%`,
        },
      },
    ],
    series: [
      ...stackSeries,
      {
        name: 'Theoretical FTE for Manual Volume',
        type: 'line',
        yAxisIndex: 0,
        data: theoretical,
        symbol: 'none',
        z: 10,
        lineStyle: { type: 'dashed', width: 2, color: colors.theoretical },
        itemStyle: { color: colors.theoretical },
      },
      ...(hasTarget
        ? [tatLine('Target TAT', labels.map(() => target), colors.target, true)]
        : []),
      tatLine('Cumulative Daily TAT', cumulative, colors.cumulative, false, 3),
      tatLine('Instant TAT', instant, colors.instant),
    ],
  }
})

const legendItems = computed<LegendItem[]>(() => {
  const chart = props.simulation?.chart
  const colors = palette.value
  const items: LegendItem[] = sortShiftKeys(Object.keys(chart?.shiftFteByKey ?? {})).map(
    (key, index) => ({
      name: shiftSeriesName(key),
      color: colors.chart[index % colors.chart.length]!,
      kind: 'bar',
    }),
  )
  items.push({
    name: 'Theoretical FTE for Manual Volume',
    color: colors.theoretical,
    kind: 'dashed',
  })
  if (props.simulation?.slaTargetRatio != null) {
    items.push({ name: 'Target TAT', color: colors.target, kind: 'dashed' })
  }
  items.push({ name: 'Cumulative Daily TAT', color: colors.cumulative, kind: 'solid' })
  items.push({ name: 'Instant TAT', color: colors.instant, kind: 'solid' })
  return items
})
</script>

<template>
  <div>
    <h4 class="mb-2.5 text-sm font-bold">Per-Shift FTE Available vs Theoretical FTE Needed</h4>
    <div
      v-if="hasData"
      class="h-64 overflow-hidden rounded-lg border bg-card px-1 pt-2"
    >
      <VChart class="h-full w-full" :option="option" autoresize />
    </div>
    <div
      v-else
      class="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
    >
      No slot chart data.
    </div>
    <div
      v-if="hasData"
      class="mt-2.5 flex flex-wrap gap-3.5 text-xs text-muted-foreground"
    >
      <span
        v-for="item in legendItems"
        :key="item.name"
        class="inline-flex items-center gap-1.5"
      >
        <span
          v-if="item.kind === 'bar'"
          class="inline-block h-2 w-4 rounded-sm"
          :style="{ backgroundColor: item.color }"
        />
        <span
          v-else-if="item.kind === 'dashed'"
          class="inline-block h-0.5 w-4 border-t border-dashed"
          :style="{ borderColor: item.color }"
        />
        <span
          v-else
          class="inline-block h-0.5 w-4"
          :style="{ backgroundColor: item.color }"
        />
        {{ item.name }}
      </span>
    </div>
  </div>
</template>
