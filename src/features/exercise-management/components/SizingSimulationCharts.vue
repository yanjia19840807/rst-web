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

import { floatingTooltip, formatChartNumber } from '@/lib/chartTooltip'

import { useDailyVolumesQuery, useMonthlyVolumesQuery } from '../api/queries'
import { monthlyTrainMonths } from '../periodWindows'
import {
  backlogAgingDays,
  dayKey,
  monthKey,
  monthlyOtFte,
  monthlySlaPercents,
  n,
  slaGoalDays,
} from '../sizingChartMath'
import type { DailySizingView, MonthlySizingView, TeamSetup } from '../types'

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
  exerciseId?: string
  sizingMonth?: string
  monthly: MonthlySizingView | null
  daily: DailySizingView | null
  teamSetup: TeamSetup | null
}>()

const monthlyVolumesQuery = useMonthlyVolumesQuery(() => props.exerciseId)
const dailyVolumesQuery = useDailyVolumesQuery(() => props.exerciseId)

function themeColor(cssVar: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
  return value || fallback
}

const palette = computed(() => ({
  volume: themeColor('--chart-1', '#071d49'),
  forecast: themeColor('--chart-3', '#79a6d2'),
  overtime: themeColor('--chart-5', '#4e7d69'),
  overcapacity: themeColor('--chart-4', '#da291c'),
  maxOt: themeColor('--chart-2', '#315f9b'),
  minHc: themeColor('--chart-2', '#315f9b'),
  axis: themeColor('--foreground', '#14233a'),
  border: themeColor('--border', '#d4dde9'),
}))

const hasMonthly = computed(
  () =>
    (props.monthly?.rows?.length ?? 0) > 0 || (monthlyVolumesQuery.data.value?.length ?? 0) > 0,
)
const hasDailySimulation = computed(() => (props.daily?.rows?.length ?? 0) > 0)
const hasDaily = computed(
  () => hasDailySimulation.value || (dailyVolumesQuery.data.value?.length ?? 0) > 0,
)

const monthlyOption = computed<ChartOption>(() => {
  const colors = palette.value
  const setup = props.teamSetup
  const sizingByMonth = new Map(
    (props.monthly?.rows ?? []).map((row) => [monthKey(row.month), row]),
  )
  const historyMonths = new Set(
    props.sizingMonth ? monthlyTrainMonths(props.sizingMonth).map((month) => monthKey(month)) : [],
  )
  const actualByMonth = new Map(
    (monthlyVolumesQuery.data.value ?? [])
      .filter((row) => {
        const key = monthKey(row.month)
        return (
          historyMonths.size === 0 || historyMonths.has(key) || sizingByMonth.has(key)
        )
      })
      .map((row) => [
        monthKey(row.month),
        row.actualVolume == null ? null : n(row.actualVolume),
      ]),
  )
  const months = [...new Set([...actualByMonth.keys(), ...sizingByMonth.keys()])].sort()

  const overcapacity: (number | null)[] = []
  const maxOvertime: (number | null)[] = []
  const weekdaysOt: (number | null)[] = []
  const maxHc: (number | null)[] = []
  const rsHc: (number | null)[] = []
  const minHc: (number | null)[] = []
  const volume: (number | null)[] = []
  const forecast: (number | null)[] = []

  for (const month of months) {
    const actual = actualByMonth.get(month)
    const row = sizingByMonth.get(month)
    volume.push(actual ?? (row ? n(row.forecastVolume) : null))
    forecast.push(actual == null && row ? n(row.forecastVolume) : null)
    if (!row || !setup) {
      overcapacity.push(null)
      maxOvertime.push(null)
      weekdaysOt.push(null)
      maxHc.push(null)
      rsHc.push(null)
      minHc.push(null)
      continue
    }
    const ot = monthlyOtFte({
      manualVolume: n(row.manualVolume),
      workdays: n(row.workdays),
      weekendDays: n(row.weekendDays),
      cycleTimeSeconds: n(row.cycleTimeSeconds),
      rightSizingHc: n(row.rightSizingHc),
      workingHoursPerDay: n(setup.workingHoursPerDay),
      availabilityRatio: n(setup.availabilityRatio),
      capacityRatio: n(setup.capacityRatio),
      maxOvertimeMinutes: n(setup.maxOvertimeMinutes),
      weekendShiftHc: n(setup.weekendShiftHc),
    })
    overcapacity.push(ot.overcapacity)
    maxOvertime.push(ot.maxOvertime)
    weekdaysOt.push(ot.weekdaysOvertime)
    maxHc.push(n(row.nominalHcWithoutOt))
    rsHc.push(n(row.rightSizingHc))
    minHc.push(n(row.nominalHcWithOt))
  }

  const fteBar = (
    name: string,
    data: (number | null)[],
    color: string,
  ): BarSeriesOption => ({
    name,
    type: 'bar',
    yAxisIndex: 0,
    data,
    itemStyle: { color, borderRadius: [3, 3, 0, 0] },
    barMaxWidth: 18,
  })

  const fteLine = (
    name: string,
    data: (number | null)[],
    color: string,
    dashed = false,
  ): LineSeriesOption => ({
    name,
    type: 'line',
    yAxisIndex: 0,
    data,
    symbol: 'none',
    lineStyle: { width: 2, color, type: dashed ? 'dashed' : 'solid' },
    itemStyle: { color },
  })

  return {
    tooltip: floatingTooltip(),
    legend: { show: false },
    grid: { left: 48, right: 52, top: 28, bottom: 16 },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.axis, fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'FTE',
        splitLine: { lineStyle: { color: colors.border } },
        axisLabel: { color: colors.axis, fontSize: 11, formatter: formatChartNumber },
      },
      {
        type: 'value',
        name: 'Volume',
        splitLine: { show: false },
        axisLabel: { color: colors.axis, fontSize: 11, formatter: formatChartNumber },
      },
    ],
    series: [
      fteBar('Overcapacity', overcapacity, colors.overcapacity),
      fteBar('Max Overtime', maxOvertime, colors.maxOt),
      fteBar('Weekdays Overtime', weekdaysOt, colors.overtime),
      fteLine('Max HC (No OT)', maxHc, colors.axis),
      fteLine('Right Size HC', rsHc, colors.overtime),
      fteLine('Min HC (Full OT)', minHc, colors.minHc, true),
      {
        name: 'Volume',
        type: 'line',
        yAxisIndex: 1,
        data: volume,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 3, color: colors.volume },
        itemStyle: { color: colors.volume },
      },
      {
        name: 'Volume Forecasted',
        type: 'line',
        yAxisIndex: 1,
        data: forecast,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 2, color: colors.forecast },
        itemStyle: { color: colors.forecast },
      },
    ],
  }
})

const dailyOption = computed<ChartOption>(() => {
  const colors = palette.value
  const simRows = [...(props.daily?.rows ?? [])].sort((a, b) =>
    a.resultDate.localeCompare(b.resultDate),
  )
  const agingRows = simRows.map((row) => ({
    holiday: Boolean(row.holiday),
    workingDay: Boolean(row.workingDay),
    backlogStart: n(row.backlogStart),
    backlogEnd: n(row.backlogEnd),
    standardCapacity: n(row.standardCapacity),
    overtimeCapacity: n(row.overtimeCapacity),
    manualVolume: n(row.manualVolume),
    month: monthKey(row.resultDate),
  }))
  const aging = backlogAgingDays(agingRows)
  const goal = slaGoalDays(
    props.teamSetup?.slaTurnaroundMinutes,
    props.teamSetup?.workingHoursPerDay,
  )
  const historyEnd = props.sizingMonth ? monthKey(props.sizingMonth) : ''
  const dates = simRows.map((row) => dayKey(row.resultDate))

  const actual: (number | null)[] = []
  const forecast: (number | null)[] = []
  const backlogOk: (number | null)[] = []
  const backlogKo: (number | null)[] = []
  const slaLine: (number | null)[] = []

  simRows.forEach((row, index) => {
    const date = dayKey(row.resultDate)
    const volume = n(row.forecastVolume)
    const history = historyEnd !== '' && monthKey(date) <= historyEnd
    const days = aging[index] ?? 0
    actual.push(history ? volume : null)
    forecast.push(history ? null : volume)
    slaLine.push(goal)
    // Keep both series populated at every point so the stroke stays continuous;
    // color switches by putting the value on OK or KO (Excel Full Period look).
    if (goal != null && days > goal) {
      backlogOk.push(days)
      backlogKo.push(days)
    } else {
      backlogOk.push(days)
      backlogKo.push(null)
    }
  })

  return {
    tooltip: floatingTooltip(),
    legend: { show: false },
    grid: { left: 52, right: 52, top: 28, bottom: 16 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: {
        color: colors.axis,
        fontSize: 10,
        hideOverlap: true,
        formatter: (value: string) => (value.length >= 10 ? value.slice(5) : value),
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Backlog aging in days',
        splitLine: { lineStyle: { color: colors.border } },
        axisLabel: { color: colors.axis, fontSize: 11, formatter: formatChartNumber },
      },
      {
        type: 'value',
        name: 'Volume',
        splitLine: { show: false },
        axisLabel: { color: colors.axis, fontSize: 11, formatter: formatChartNumber },
      },
    ],
    series: [
      {
        name: 'Volume',
        type: 'bar',
        yAxisIndex: 1,
        data: actual,
        itemStyle: { color: colors.volume, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 8,
        z: 1,
      },
      {
        name: 'Volume Forecasted',
        type: 'bar',
        yAxisIndex: 1,
        data: forecast,
        itemStyle: { color: colors.forecast, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 8,
        barGap: '-100%',
        z: 1,
      },
      {
        name: 'SLA Turntime',
        type: 'line',
        yAxisIndex: 0,
        data: slaLine,
        symbol: 'none',
        z: 5,
        lineStyle: { width: 2, type: 'dashed', color: colors.axis },
        itemStyle: { color: colors.axis },
      },
      {
        name: 'Backlog OK',
        type: 'line',
        yAxisIndex: 0,
        data: backlogOk,
        symbol: 'circle',
        symbolSize: 5,
        connectNulls: true,
        z: 6,
        lineStyle: { width: 3, color: colors.overtime },
        itemStyle: { color: colors.overtime },
      },
      {
        name: 'Backlog KO',
        type: 'line',
        yAxisIndex: 0,
        data: backlogKo,
        symbol: 'circle',
        symbolSize: 5,
        connectNulls: false,
        z: 7,
        lineStyle: { width: 3, color: colors.overcapacity },
        itemStyle: { color: colors.overcapacity },
      },
    ],
  }
})

const slaOption = computed<ChartOption>(() => {
  const colors = palette.value
  const simRows = [...(props.daily?.rows ?? [])].sort((a, b) =>
    a.resultDate.localeCompare(b.resultDate),
  )
  const agingRows = simRows.map((row) => ({
    holiday: Boolean(row.holiday),
    workingDay: Boolean(row.workingDay),
    backlogStart: n(row.backlogStart),
    backlogEnd: n(row.backlogEnd),
    standardCapacity: n(row.standardCapacity),
    overtimeCapacity: n(row.overtimeCapacity),
    manualVolume: n(row.manualVolume),
    month: monthKey(row.resultDate),
  }))
  const aging = backlogAgingDays(agingRows)
  const goalDays = slaGoalDays(
    props.teamSetup?.slaTurnaroundMinutes,
    props.teamSetup?.workingHoursPerDay,
  )
  const monthly = goalDays == null ? [] : monthlySlaPercents(agingRows, aging, goalDays)
  const months = monthly.map((row) => row.month)
  const slaPct = monthly.map((row) => row.slaPct)
  const goal =
    props.teamSetup?.slaTargetRatio == null
      ? null
      : Math.round(n(props.teamSetup.slaTargetRatio) * 1000) / 10

  return {
    tooltip: floatingTooltip({
      valueFormatter: (value) => `${formatChartNumber(value)}%`,
    }),
    legend: { show: false },
    grid: { left: 48, right: 24, top: 24, bottom: 16 },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.axis, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: {
        color: colors.axis,
        fontSize: 11,
        formatter: '{value}%',
      },
      splitLine: { lineStyle: { color: colors.border } },
    },
    series: [
      {
        name: 'SLA%',
        type: 'line',
        data: slaPct,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: colors.volume },
        itemStyle: { color: colors.volume },
        label: {
          show: true,
          formatter: (params) => `${formatChartNumber(params.value)}%`,
          color: colors.axis,
          fontSize: 11,
        },
      },
      ...(goal == null
        ? []
        : [
            {
              name: 'SLAGoal',
              type: 'line' as const,
              data: months.map(() => goal),
              symbol: 'none',
              lineStyle: { type: 'dashed' as const, width: 2, color: colors.axis },
              itemStyle: { color: colors.axis },
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
            <span class="inline-block h-2 w-4 rounded-sm bg-chart-2" />
            Max Overtime
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-4 rounded-sm bg-chart-5" />
            Weekdays Overtime
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 bg-foreground" />
            Max HC (No OT)
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 bg-chart-5" />
            Right Size HC
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 border-t border-dashed border-chart-2" />
            Min HC (Full OT)
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 bg-chart-1" />
            Volume
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 bg-chart-3" />
            Volume Forecasted
          </span>
        </div>
      </div>

      <div class="border-t pt-5">
        <h4 class="mb-2.5 text-sm font-bold">Daily Volume vs Backlog Aging - Full Period</h4>
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
            <span class="inline-block h-2 w-4 rounded-sm bg-chart-1" />
            Volume
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-4 rounded-sm bg-chart-3" />
            Volume Forecasted
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 border-t border-dashed border-foreground" />
            SLA Turntime
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 bg-chart-5" />
            Backlog OK
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block size-2 rounded-full bg-destructive" />
            Backlog KO
          </span>
        </div>
      </div>

      <div class="border-t pt-5">
        <h4 class="mb-2.5 text-sm font-bold">Monthly SLA% vs Goal</h4>
        <div
          v-if="hasDailySimulation"
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
        <div class="mt-2.5 flex flex-wrap gap-3.5 text-xs text-muted-foreground">
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 border-t border-dashed border-foreground" />
            SLAGoal
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-0.5 w-4 bg-chart-1" />
            SLA%
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
