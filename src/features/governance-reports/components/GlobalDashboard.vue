<script setup lang="ts">
import { BarChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { toast } from 'vue-sonner'
import type { BarSeriesOption } from 'echarts/charts'
import type { ComposeOption } from 'echarts/core'
import type {
  GridComponentOption,
  MarkLineComponentOption,
  TooltipComponentOption,
} from 'echarts/components'

import ListLoading from '@/components/ListLoading.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { NativeSelect } from '@/components/ui/native-select'
import { FieldUnit, withUnit } from '@/features/exercise-management/fieldUnits'
import { CHART_UPDATE_OPTIONS, useChartTheme } from '@/lib/chartTheme'
import { floatingTooltip } from '@/lib/chartTooltip'

import { useDashboardQuery } from '../api/queries'
import { formatHc } from '../reportFormat'
import FilterField from './FilterField.vue'
import MetricCard from './MetricCard.vue'
import type { DashboardCenterRow } from '../types'

use([CanvasRenderer, BarChart, GridComponent, MarkLineComponent, TooltipComponent])

type ChartOption = ComposeOption<
  BarSeriesOption | GridComponentOption | MarkLineComponentOption | TooltipComponentOption
>

const COMPLETION_AXIS = withUnit('Completion', FieldUnit.percent)
const CENTER_AXIS = 'GBS Center'

const selectedGbs = ref('')
const comparisonView = ref('Completion by domain')

const dashboardQuery = useDashboardQuery()
const data = computed(() => dashboardQuery.data.value)
const loading = computed(() => dashboardQuery.isPending.value && !dashboardQuery.data.value)
const centerOptions = computed(() => data.value?.centers.map((row) => row.center) ?? [])
const domainRows = computed(() => {
  if (!data.value || !selectedGbs.value) return []
  return data.value.domainsByCenter[selectedGbs.value] ?? []
})
const { colors: palette } = useChartTheme()

function centerLabel(center: string) {
  return center.replace(/^GBS\s+/i, '') || center
}

function completionValue(pct: string): number | null {
  const n = Number.parseFloat(pct)
  return Number.isFinite(n) ? n : null
}

const chartOption = computed<ChartOption>(() => {
  const colors = palette.value
  const centers = data.value?.centers ?? []
  return {
    grid: { left: 56, right: 16, top: 28, bottom: 48 },
    tooltip: floatingTooltip({
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const points = Array.isArray(params) ? params : [params]
        const index = points[0]?.dataIndex ?? 0
        const row: DashboardCenterRow | undefined = centers[index]
        if (!row) return ''
        return [
          `<b>${row.center}</b>`,
          `${COMPLETION_AXIS}: ${row.completionPct}`,
          `Completed this quarter: ${formatHc(row.completedThisQuarter, 1)} ${FieldUnit.hc}`,
          `Applicable: ${formatHc(row.applicableHc, 1)} ${FieldUnit.hc}`,
        ].join('<br/>')
      },
    }),
    xAxis: {
      type: 'category',
      name: CENTER_AXIS,
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: colors.axis, fontSize: 11 },
      data: centers.map((row) => centerLabel(row.center)),
      axisLabel: {
        color: colors.axis,
        fontSize: 11,
        rotate: centers.length > 5 ? 30 : 0,
      },
      axisLine: { lineStyle: { color: colors.border } },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      name: COMPLETION_AXIS,
      nameGap: 8,
      nameTextStyle: { color: colors.axis, fontSize: 11, align: 'left' },
      axisLabel: {
        color: colors.axis,
        fontSize: 11,
        formatter: (value: number) => `${value}%`,
      },
      splitLine: { lineStyle: { color: colors.border } },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 28,
        data: centers.map((row) => ({
          value: completionValue(row.completionPct),
          itemStyle: { color: row.onTrack ? colors.cumulative : colors.overcapacity },
        })),
        markLine: {
          silent: true,
          symbol: 'none',
          label: { color: colors.axis, fontSize: 10, formatter: '50%' },
          lineStyle: { type: 'dashed', color: colors.target },
          data: [{ yAxis: 50 }],
        },
      },
    ],
  }
})

watch(
  centerOptions,
  (centers) => {
    if (!centers.length) {
      selectedGbs.value = ''
      return
    }
    if (!centers.includes(selectedGbs.value)) {
      selectedGbs.value = centers[0]!
    }
  },
  { immediate: true },
)

watch(
  () => dashboardQuery.isError.value,
  (isError) => {
    if (isError) {
      toast.error(
        dashboardQuery.error.value instanceof Error
          ? dashboardQuery.error.value.message
          : 'Could not load dashboard.',
      )
    }
  },
)
</script>

<template>
  <div class="space-y-4">
    <ListLoading v-if="loading" class="h-48" />

    <template v-else-if="data">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          v-for="metric in data.metrics"
          :key="metric.label"
          :label="metric.label"
          :value="metric.value"
          :hint="metric.hint"
          :tone="metric.tone"
        />
      </div>

      <div class="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">RST Completion And Aging By GBS Center</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div v-if="data.centers.length" class="h-[240px] min-w-0">
              <VChart
                class="h-full w-full"
                :option="chartOption"
                :update-options="CHART_UPDATE_OPTIONS"
                autoresize
              />
            </div>
            <p class="text-xs text-muted-foreground">
              Y axis is {{ COMPLETION_AXIS }} this quarter (applicable Delivery HC). X axis is
              {{ CENTER_AXIS }}. Dashed line is the 50% on-track threshold.
            </p>
            <div class="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span class="inline-flex items-center gap-1.5">
                <span
                  class="inline-block h-2 w-4 rounded-sm"
                  :style="{ background: palette.cumulative }"
                />
                Completion on track
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span
                  class="inline-block h-2 w-4 rounded-sm"
                  :style="{ background: palette.overcapacity }"
                />
                Completion behind
              </span>
            </div>

            <div class="min-w-0 overflow-x-auto rounded-lg border">
              <Table class="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>GBS Center</TableHead>
                    <TableHead>RST Applicable HC</TableHead>
                    <TableHead>Completed this quarter</TableHead>
                    <TableHead>Completion (%)</TableHead>
                    <TableHead>Completed in 3-6 months</TableHead>
                    <TableHead>Never done</TableHead>
                    <TableHead>Completed in 6-12 months</TableHead>
                    <TableHead>Completed over 1 year ago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in data.centers" :key="row.center">
                    <TableCell>{{ row.center }}</TableCell>
                    <TableCell>{{ formatHc(row.applicableHc, 1) }}</TableCell>
                    <TableCell>{{ formatHc(row.completedThisQuarter, 1) }}</TableCell>
                    <TableCell>{{ row.completionPct }}</TableCell>
                    <TableCell>{{ formatHc(row.completed3To6Months, 1) }}</TableCell>
                    <TableCell>{{ formatHc(row.neverDone, 1) }}</TableCell>
                    <TableCell>{{ formatHc(row.completed6To12Months, 1) }}</TableCell>
                    <TableCell>{{ formatHc(row.completedOver1Year, 1) }}</TableCell>
                  </TableRow>
                  <TableRow v-if="!data.centers.length">
                    <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
                      No ACTIVE Timesheet Delivery HC found.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">Domain Drill-Down For Selected GBS</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <FilterField label="Selected GBS">
                <NativeSelect v-model="selectedGbs" class="w-full">
                  <option v-for="center in centerOptions" :key="center" :value="center">
                    {{ center }}
                  </option>
                </NativeSelect>
              </FilterField>
              <FilterField label="Comparison view">
                <NativeSelect v-model="comparisonView" class="w-full">
                  <option value="Completion by domain">Completion by domain</option>
                </NativeSelect>
              </FilterField>
            </div>
            <div class="min-w-0 overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>RST Applicable HC</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Completion (%)</TableHead>
                    <TableHead>Never done</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in domainRows" :key="row.domain">
                    <TableCell>{{ row.domain }}</TableCell>
                    <TableCell>{{ formatHc(row.applicableHc, 1) }}</TableCell>
                    <TableCell>{{ formatHc(row.completed, 1) }}</TableCell>
                    <TableCell>{{ row.pct }}</TableCell>
                    <TableCell>{{ formatHc(row.neverDone, 1) }}</TableCell>
                  </TableRow>
                  <TableRow v-if="!domainRows.length">
                    <TableCell colspan="5" class="h-20 text-center text-muted-foreground">
                      {{
                        selectedGbs
                          ? `No domain rows for ${selectedGbs}.`
                          : 'No ACTIVE Timesheet Delivery HC found.'
                      }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p class="text-xs text-muted-foreground">View: {{ comparisonView }}</p>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
