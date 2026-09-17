<script setup lang="ts">
import { BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { ComposeOption } from 'echarts/core'
import type { BarSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldUnit, withUnit } from '@/features/exercise-management/fieldUnits'
import { CHART_UPDATE_OPTIONS, useChartTheme } from '@/lib/chartTheme'
import { floatingTooltip, formatChartNumber } from '@/lib/chartTooltip'

import { toChartNumber } from '../benchmarkingChartMath'
import { formatCapacity, formatPct } from '../reportFormat'
import type { BenchmarkCenterComparison } from '../types'

use([CanvasRenderer, BarChart, GridComponent, LegendComponent, TooltipComponent])

type ChartOption = ComposeOption<
  BarSeriesOption | GridComponentOption | LegendComponentOption | TooltipComponentOption
>

const CAPACITY_LABEL = withUnit('Daily Production Capacity / Agent', FieldUnit.transactions)
const RATIO_LABEL = withUnit('Production Support Ratio', FieldUnit.percent)

const props = defineProps<{
  centers: BenchmarkCenterComparison[]
}>()

const { colors: palette } = useChartTheme()

function centerLabel(gbs: string) {
  return gbs.replace(/^GBS\s+/i, '') || gbs
}

const option = computed<ChartOption>(() => {
  const colors = palette.value
  const categories = props.centers.map((row) => centerLabel(row.gbs))
  const capacity = props.centers.map((row) => toChartNumber(row.dailyCapacityPerAgent))
  const ratio = props.centers.map((row) => toChartNumber(row.productionSupportRatioPct))
  return {
    legend: {
      top: 0,
      textStyle: { color: colors.axis, fontSize: 11 },
    },
    grid: { left: 56, right: 52, top: 36, bottom: 36 },
    tooltip: floatingTooltip({
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const points = Array.isArray(params) ? params : [params]
        const index = points[0]?.dataIndex ?? 0
        const center = props.centers[index]
        return [
          `<b>${center?.gbs ?? ''}</b>`,
          `${CAPACITY_LABEL}: ${formatCapacity(capacity[index])}`,
          `${RATIO_LABEL}: ${formatPct(ratio[index])}`,
        ].join('<br/>')
      },
    }),
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: colors.axis,
        fontSize: 11,
        rotate: categories.length > 5 ? 30 : 0,
      },
      axisLine: { lineStyle: { color: colors.border } },
    },
    yAxis: [
      {
        type: 'value',
        min: 0,
        name: FieldUnit.transactions,
        nameGap: 8,
        nameTextStyle: { color: colors.axis, fontSize: 11, align: 'left' },
        axisLabel: { color: colors.axis, fontSize: 11, formatter: formatChartNumber },
        splitLine: { lineStyle: { color: colors.border } },
      },
      {
        type: 'value',
        min: 0,
        name: FieldUnit.percent,
        nameGap: 8,
        nameTextStyle: { color: colors.axis, fontSize: 11, align: 'right' },
        axisLabel: {
          color: colors.axis,
          fontSize: 11,
          formatter: (value: number) => `${formatChartNumber(value)}%`,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: CAPACITY_LABEL,
        type: 'bar',
        yAxisIndex: 0,
        data: capacity,
        itemStyle: { color: colors.center },
        barMaxWidth: 28,
        label: {
          show: true,
          position: 'top',
          color: colors.axis,
          fontSize: 10,
          formatter: (params) => formatCapacity(params.value as number | null),
        },
      },
      {
        name: RATIO_LABEL,
        type: 'bar',
        yAxisIndex: 1,
        data: ratio,
        itemStyle: { color: colors.rolling },
        barMaxWidth: 28,
        label: {
          show: true,
          position: 'top',
          color: colors.axis,
          fontSize: 10,
          formatter: (params) => formatPct(params.value as number | null),
        },
      },
    ],
  }
})
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-base">Center comparison</CardTitle>
      <p class="text-xs text-muted-foreground">
        Grouped bars by Center. Left axis is daily capacity (transactions), right axis is
        production support ratio (%). Both are Delivery HC weighted per Center, same as the table.
        Same filtered set, not the current page.
      </p>
    </CardHeader>
    <CardContent>
      <div v-if="centers.length" class="h-80 min-w-0">
        <VChart class="h-full w-full" :option="option" :update-options="CHART_UPDATE_OPTIONS" autoresize />
      </div>
      <p v-else class="text-sm text-muted-foreground">No center metrics to compare.</p>
    </CardContent>
  </Card>
</template>
