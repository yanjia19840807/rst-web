<script setup lang="ts">
import { computed } from 'vue'

import ListLoading from '@/components/ListLoading.vue'
import TabStrip from '@/components/TabStrip.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { FieldUnit, withUnit } from '../fieldUnits'
import { useAssociatedDataPanel } from '../composables/useAssociatedDataPanel'
import { deriveSlotPeriodLabel } from '../periodWindows'
import { normalizeHolidayType } from '../weekendCodes'
import { AD_TAB_LABELS, formatNumber } from './associated-data/adTypes'
import { sumSupportFte } from './associated-data/supportOptions'
import AdTmsSummary from './associated-data/AdTmsSummary.vue'
import AssociatedDataEditorDialog from './associated-data/AssociatedDataEditorDialog.vue'

const props = defineProps<{
  exerciseId: string
  sizingMonth: string
  slotStartDate: string | null
  slotWeeks: number | null
  readOnly?: boolean
}>()

const {
  tabs,
  activeTab,
  loading,
  teamSetup,
  support,
  calendar,
  monthly,
  daily,
  slot,
  cycleTime,
  editorOpen,
  editor,
  medianSource,
  openEditor,
  onCycleTimeUpdated,
} = useAssociatedDataPanel(() => props.exerciseId)

const supportFte = computed(() => sumSupportFte(support.value))

const supportAnnualHours = computed(() => {
  if (!support.value.length) return null
  return support.value.reduce((sum, item) => sum + (Number(item.workloadPerYearHours) || 0), 0)
})

const holidayCounts = computed(() => {
  const holidays = calendar.value?.holidays ?? []
  let rest = 0
  let makeup = 0
  for (const row of holidays) {
    if (normalizeHolidayType(row.holidayType) === 'NORMAL') makeup += 1
    else rest += 1
  }
  return { rest, makeup, total: holidays.length }
})

const volumeSummary = computed(() => {
  const months = [...monthly.value].sort((a, b) => a.month.localeCompare(b.month))
  const days = [...daily.value].sort((a, b) => a.volumeDate.localeCompare(b.volumeDate))
  const monthVolume = months.reduce((sum, row) => sum + Number(row.actualVolume ?? 0), 0)
  const dayVolume = days.reduce((sum, row) => sum + Number(row.actualVolume ?? 0), 0)
  const slotVolume = slot.value.reduce((sum, row) => sum + Number(row.actualVolume || 0), 0)
  const monthPeriod =
    months.length === 0
      ? '—'
      : months[0].month === months[months.length - 1].month
        ? months[0].month
        : `${months[0].month} – ${months[months.length - 1].month}`
  const dayPeriod =
    days.length === 0
      ? '—'
      : days[0].volumeDate === days[days.length - 1].volumeDate
        ? days[0].volumeDate
        : `${days[0].volumeDate} – ${days[days.length - 1].volumeDate}`
  return [
    {
      granularity: 'Month',
      period: monthPeriod,
      volume: months.length ? formatNumber(monthVolume, 2) : '—',
      rows: `${months.length} months`,
    },
    {
      granularity: 'Daily',
      period: dayPeriod,
      volume: days.length ? formatNumber(dayVolume, 2) : '—',
      rows: `${days.length} days`,
    },
    {
      granularity: 'Slot',
      period:
        props.slotStartDate && props.slotWeeks
          ? deriveSlotPeriodLabel(props.slotStartDate, props.slotWeeks)
          : 'Not set',
      volume: slot.value.length ? formatNumber(slotVolume, 2) : '—',
      rows: `${slot.value.length} slots`,
    },
  ]
})

const editorActionLabel = computed(() => {
  const name = AD_TAB_LABELS[activeTab.value]
  return props.readOnly ? `View ${name}` : `Edit ${name}`
})
</script>

<template>
  <Card>
    <CardHeader class="items-center">
      <div>
        <CardTitle class="text-base">Associated Data</CardTitle>
        <p class="mt-1 text-xs text-muted-foreground">
          Shared by all scenarios in this exercise. Team Setup, Support and Calendar are seeded from
          Toolkit latest state. Volume is pre-filled from Toolkit volume when available.
        </p>
      </div>
      <CardAction>
        <Button variant="outline" :disabled="loading" @click="openEditor(activeTab)">
          {{ editorActionLabel }}
        </Button>
      </CardAction>
    </CardHeader>

    <TabStrip
      class="px-4"
      :tabs="tabs.map((tab) => ({ key: tab, label: AD_TAB_LABELS[tab] }))"
      :model-value="activeTab"
      @update:model-value="activeTab = $event"
    />

    <CardContent>
      <ListLoading v-if="loading" />

      <template v-else-if="activeTab === 'team'">
        <div class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Baseline Output</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{{ withUnit('Daily capacity / agent', FieldUnit.transactions) }}</TableCell>
                <TableCell>{{ formatNumber(teamSetup?.dailyCapacityPerAgent, 0) }}</TableCell>
                <TableCell class="text-muted-foreground">
                  Calculated from baseline inputs
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{{ withUnit('Working days', FieldUnit.days) }}</TableCell>
                <TableCell>{{ formatNumber(teamSetup?.workingDaysPerYear, 2) }}</TableCell>
                <TableCell class="text-muted-foreground">
                  Calendar and holiday adjusted
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>

      <template v-else-if="activeTab === 'tms'">
        <AdTmsSummary
          v-model:source="medianSource"
          :cycle-time="cycleTime"
          :exercise-id="props.exerciseId"
          :read-only="props.readOnly"
        />
      </template>

      <template v-else-if="activeTab === 'support'">
        <div class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Summary</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{{ withUnit('Total support', FieldUnit.fte) }}</TableCell>
                <TableCell>
                  {{ supportFte != null ? formatNumber(supportFte, 2) : '—' }}
                </TableCell>
                <TableCell class="text-muted-foreground">Summed from registry</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{{ withUnit('Annual support hours', FieldUnit.hours) }}</TableCell>
                <TableCell>
                  {{
                    supportAnnualHours != null ? formatNumber(supportAnnualHours, 2) : '—'
                  }}
                </TableCell>
                <TableCell class="text-muted-foreground">Sum of Hours / year</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>

      <template v-else-if="activeTab === 'calendar'">
        <table class="w-full border-collapse text-sm">
          <tbody>
            <tr class="border-b">
              <td class="w-[32%] py-2 text-muted-foreground">Holiday / Weekend days</td>
              <td class="py-2">{{ holidayCounts.rest }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 text-muted-foreground">Makeup (Normal) days</td>
              <td class="py-2">{{ holidayCounts.makeup }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 text-muted-foreground">Listed dates</td>
              <td class="py-2">{{ holidayCounts.total }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <template v-else>
        <div class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time Granularity</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in volumeSummary" :key="row.granularity">
                <TableCell>{{ row.granularity }}</TableCell>
                <TableCell>{{ row.period }}</TableCell>
                <TableCell>{{ row.volume }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>
    </CardContent>
  </Card>

  <AssociatedDataEditorDialog
    v-model:open="editorOpen"
    :editor="editor"
    :exercise-id="props.exerciseId"
    :sizing-month="props.sizingMonth"
    :slot-start-date="props.slotStartDate"
    :slot-weeks="props.slotWeeks"
    :team-setup="teamSetup"
    :support="support"
    :calendar="calendar"
    :monthly="monthly"
    :daily="daily"
    :slot="slot"
    :cycle-time="cycleTime"
    :median-source="medianSource"
    :read-only="props.readOnly"
    @update:team-setup="teamSetup = $event"
    @update:support="support = $event"
    @update:calendar="calendar = $event"
    @update:monthly="monthly = $event"
    @update:daily="daily = $event"
    @update:slot="slot = $event"
    @update:cycle-time="onCycleTimeUpdated"
    @close="editor = null"
  />
</template>
