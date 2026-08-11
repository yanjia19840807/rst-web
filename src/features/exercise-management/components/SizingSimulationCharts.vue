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

import type { DailySizingView, MonthlySizingView } from '../types'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
])

type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
>

const props = defineProps<{
  monthly: MonthlySizingView | null
  daily: DailySizingView | null
  slaTargetRatio: number | null
}>()

const primary = 'hsl(var(--primary))'
const destructive = 'hsl(var(--destructive))'
const mutedBar = 'hsl(var(--muted-foreground) / 0.35)'
const foreground = 'hsl(var(--foreground))'
const okGreen = 'hsl(142 60% 40%)'
const border = 'hsl(var(--border))'

function num(value: number | string | null | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const hasMonthly = computed(() => (props.monthly?.rows?.length ?? 0) > 0)
const hasDaily = computed(() => (props.daily?.rows?.length ?? 0) > 0)

const monthlyOption = computed<ChartOption>(() => {
  const rows = [...(props.monthly?.rows ?? [])].sort((a, b) => a.month.localeCompare(b.month))
  const categories = rows.map((row) => row.month)
  const volumes = rows.map((row) => num(row.manualVolume))
  const rsHc = rows.map((row) => num(row.rightSizingHc))
  const gaps = rows.map((row) =>
    Math.max(0, num(row.nominalHcWithoutOt) - num(row.rightSizingHc)),
  )
  const barColors = rows.map((row) =>
    num(row.nominalHcWithOt) > num(row.rightSizingHc) ? destructive : primary,
  )
  const rsLine = rsHc[0] ?? 0

  return {
    color: [primary, foreground],
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['Overcapacity / Weekday OT', 'Volume', 'Right Sizing HC'],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: { left: 48, right: 48, top: 24, bottom: 48 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: border } },
      axisLabel: { color: foreground, fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Volume',
        splitLine: { lineStyle: { color: border } },
        axisLabel: { color: foreground, fontSize: 11 },
      },
      {
        type: 'value',
        name: 'HC',
        splitLine: { show: false },
        axisLabel: { color: foreground, fontSize: 11 },
      },
    ],
    series: [
      {
        name: 'Overcapacity / Weekday OT',
        type: 'bar',
        yAxisIndex: 1,
        data: gaps.map((value, index) => ({
          value,
          itemStyle: { color: barColors[index], borderRadius: [4, 4, 0, 0] },
        })),
        barMaxWidth: 28,
      },
      {
        name: 'Volume',
        type: 'line',
        yAxisIndex: 0,
        data: volumes,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 3, color: foreground },
        itemStyle: { color: foreground },
      },
      {
        name: 'Right Sizing HC',
        type: 'line',
        yAxisIndex: 1,
        data: categories.map(() => rsLine),
        symbol: 'none',
        lineStyle: { type: 'dashed', width: 2, color: foreground },
        itemStyle: { color: foreground },
      },
    ],
  }
})

const dailyOption = computed<ChartOption>(() => {
  const rows = [...(props.daily?.rows ?? [])].sort((a, b) =>
    a.resultDate.localeCompare(b.resultDate),
  )
  const categories = rows.map((row) => row.resultDate.slice(8))
  const volumes = rows.map((row) => num(row.forecastVolume))
  const backlog = rows.map((row) => num(row.backlogEnd))

  return {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['Forecast', 'Backlog'],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: { left: 48, right: 24, top: 24, bottom: 48 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: border } },
      axisLabel: { color: foreground, fontSize: 10, interval: 0 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: border } },
      axisLabel: { color: foreground, fontSize: 11 },
    },
    series: [
      {
        name: 'Forecast',
        type: 'bar',
        data: volumes.map((value, index) => ({
          value,
          itemStyle: {
            color: rows[index]?.workingDay ? foreground : mutedBar,
            borderRadius: [4, 4, 0, 0],
            opacity: rows[index]?.workingDay ? 0.85 : 0.45,
          },
        })),
        barMaxWidth: 16,
      },
      {
        name: 'Backlog',
        type: 'line',
        data: backlog.map((value) => ({
          value,
          itemStyle: { color: value === 0 ? okGreen : destructive },
        })),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: okGreen },
      },
    ],
  }
})

const slaOption = computed<ChartOption>(() => {
  const rows = props.daily?.rows ?? []
  const byMonth = new Map<string, { ok: number; total: number }>()
  for (const row of rows) {
    if (!row.workingDay) continue
    const month = row.resultDate.slice(0, 7)
    const bucket = byMonth.get(month) ?? { ok: 0, total: 0 }
    bucket.total += 1
    if (num(row.backlogEnd) === 0) bucket.ok += 1
    byMonth.set(month, bucket)
  }
  const months = [...byMonth.keys()].sort()
  const slaPct = months.map((month) => {
    const bucket = byMonth.get(month)!
    return bucket.total === 0 ? 0 : (bucket.ok / bucket.total) * 100
  })
  const goal =
    props.slaTargetRatio == null ? null : Math.round(num(props.slaTargetRatio) * 1000) / 10

  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${Number(value).toFixed(1)}%`,
    },
    legend: {
      data: goal == null ? ['SLA%'] : ['SLA%', 'SLA Goal'],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: { left: 48, right: 24, top: 24, bottom: 48 },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: border } },
      axisLabel: { color: foreground, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: {
        color: foreground,
        fontSize: 11,
        formatter: '{value}%',
      },
      splitLine: { lineStyle: { color: border } },
    },
    series: [
      {
        name: 'SLA%',
        type: 'line',
        data: slaPct,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: foreground },
        itemStyle: { color: foreground },
        label: {
          show: true,
          formatter: (params) => `${Number(params.value).toFixed(0)}%`,
          color: foreground,
          fontSize: 11,
        },
      },
      ...(goal == null
        ? []
        : [
            {
              name: 'SLA Goal',
              type: 'line' as const,
              data: months.map(() => goal),
              symbol: 'none',
              lineStyle: { type: 'dashed' as const, width: 2, color: foreground },
              itemStyle: { color: foreground },
            },
          ]),
    ],
  }
})
</script>

<template>
  <section class="rounded-lg border bg-card p-4">
    <h3 class="mb-4 text-base font-bold">Sizing Simulation Result</h3>

    <div class="space-y-5">
      <div>
        <h4 class="mb-2.5 text-sm font-bold">Monthly Volume vs Overtime</h4>
        <div
          v-if="hasMonthly"
          class="h-52 overflow-hidden rounded-lg border bg-card px-1 pt-2"
        >
          <VChart class="h-full w-full" :option="monthlyOption" autoresize />
        </div>
        <div
          v-else
          class="flex h-52 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        >
          No monthly sizing data.
        </div>
        <div class="mt-2.5 flex flex-wrap gap-3.5 text-xs text-muted-foreground">
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-4 rounded-sm bg-destructive" />
            Overcapacity
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-4 rounded-sm bg-primary" />
            Weekday overtime
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 bg-foreground" />
            Volume
          </span>
        </div>
      </div>

      <div class="border-t pt-5">
        <h4 class="mb-2.5 text-sm font-bold">Daily Volume vs Backlog Aging</h4>
        <div
          v-if="hasDaily"
          class="h-52 overflow-hidden rounded-lg border bg-card px-1 pt-2"
        >
          <VChart class="h-full w-full" :option="dailyOption" autoresize />
        </div>
        <div
          v-else
          class="flex h-52 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        >
          No daily simulation data.
        </div>
        <div class="mt-2.5 flex flex-wrap gap-3.5 text-xs text-muted-foreground">
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-4 rounded-sm bg-foreground" />
            Forecast (working day)
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-4 rounded-sm bg-muted-foreground/40" />
            Non-working day
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 bg-[hsl(142_60%_40%)]" />
            Backlog OK
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-2 rounded-full bg-destructive" />
            Backlog KO
          </span>
        </div>
      </div>

      <div class="border-t pt-5">
        <h4 class="mb-2.5 text-sm font-bold">Monthly SLA% vs Goal</h4>
        <div
          v-if="hasDaily"
          class="h-44 overflow-hidden rounded-lg border bg-card px-1 pt-2"
        >
          <VChart class="h-full w-full" :option="slaOption" autoresize />
        </div>
        <div
          v-else
          class="flex h-44 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        >
          No daily simulation data for SLA%.
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          SLA% is backlog-clearance on working days (proxy until daily SLA aging is implemented).
        </p>
      </div>
    </div>
  </section>
</template>
