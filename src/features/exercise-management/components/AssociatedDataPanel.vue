<script setup lang="ts">
import { computed } from 'vue'

import ListLoading from '@/components/ListLoading.vue'
import TabStrip from '@/components/TabStrip.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { FieldUnit, withUnit } from '../fieldUnits'
import { useAssociatedDataPanel } from '../composables/useAssociatedDataPanel'
import { useExerciseWorkspace } from '../composables/useExerciseWorkspace'
import { deriveSlotPeriodLabel } from '../periodWindows'
import { countHolidayTypes } from '../weekendCodes'
import { AD_TAB_LABELS, formatNumber } from './associated-data/adTypes'
import { sumSupportFte } from './associated-data/supportOptions'
import AdSummaryTable from './associated-data/AdSummaryTable.vue'
import AdTmsSummary from './associated-data/AdTmsSummary.vue'
import AssociatedDataEditorDialog from './associated-data/AssociatedDataEditorDialog.vue'

const props = defineProps<{
  exerciseId: string
  sizingMonth: string
  slotStartDate: string | null
  slotWeeks: number | null
  tmsFrom: string | null
  tmsTo: string | null
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

const holidayCounts = computed(() => countHolidayTypes(calendar.value?.holidays ?? []))

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
    { label: 'Month period', value: monthPeriod },
    {
      label: withUnit('Month volume', FieldUnit.transactions),
      value: months.length ? formatNumber(monthVolume, 2) : '—',
    },
    { label: 'Daily period', value: dayPeriod },
    {
      label: withUnit('Daily volume', FieldUnit.transactions),
      value: days.length ? formatNumber(dayVolume, 2) : '—',
    },
    {
      label: 'Slot period',
      value:
        props.slotStartDate && props.slotWeeks
          ? deriveSlotPeriodLabel(props.slotStartDate, props.slotWeeks)
          : 'Not set',
    },
    {
      label: withUnit('Slot volume', FieldUnit.transactions),
      value: slot.value.length ? formatNumber(slotVolume, 2) : '—',
    },
  ]
})

const teamRows = computed(() => [
  {
    label: withUnit('Daily capacity / agent', FieldUnit.transactions),
    value: formatNumber(teamSetup.value?.dailyCapacityPerAgent, 0),
  },
  {
    label: withUnit('Working days', FieldUnit.days),
    value: formatNumber(teamSetup.value?.workingDaysPerYear, 2),
  },
])

const supportRows = computed(() => [
  {
    label: withUnit('Total support', FieldUnit.fte),
    value: supportFte.value != null ? formatNumber(supportFte.value, 2) : '—',
  },
  {
    label: withUnit('Annual support hours', FieldUnit.hours),
    value: supportAnnualHours.value != null ? formatNumber(supportAnnualHours.value, 2) : '—',
  },
])

const calendarRows = computed(() => [
  { label: 'Holiday / Weekend days', value: holidayCounts.value.rest },
  { label: 'Makeup (Normal) days', value: holidayCounts.value.makeup },
  { label: 'Listed dates', value: holidayCounts.value.total },
])

const summaryRows = computed(() => {
  if (activeTab.value === 'team') return teamRows.value
  if (activeTab.value === 'support') return supportRows.value
  if (activeTab.value === 'calendar') return calendarRows.value
  return volumeSummary.value
})

const editorActionLabel = computed(() => {
  const name = AD_TAB_LABELS[activeTab.value]
  return props.readOnly ? `View ${name}` : `Edit ${name}`
})

const workspace = useExerciseWorkspace()

function onAssociatedDataWritten() {
  workspace?.notifyAssociatedDataChanged()
}
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

      <AdTmsSummary
        v-else-if="activeTab === 'tms'"
        :source="medianSource"
        :cycle-time="cycleTime"
        :tms-from="props.tmsFrom"
        :tms-to="props.tmsTo"
        :exercise-id="props.exerciseId"
        :read-only="props.readOnly"
      />
      <AdSummaryTable v-else :rows="summaryRows" />
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
    :tms-from="props.tmsFrom"
    :tms-to="props.tmsTo"
    :median-source="medianSource"
    :read-only="props.readOnly"
    @update:median-source="medianSource = $event"
    @update:team-setup="teamSetup = $event"
    @update:support="support = $event"
    @update:calendar="calendar = $event"
    @update:monthly="monthly = $event"
    @update:daily="daily = $event"
    @update:slot="slot = $event"
    @update:cycle-time="onCycleTimeUpdated"
    @written="onAssociatedDataWritten"
    @close="editor = null"
  />
</template>
