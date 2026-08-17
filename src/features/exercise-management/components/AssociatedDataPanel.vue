<script setup lang="ts">
import { computed } from 'vue'

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

import { useAssociatedDataPanel } from '../composables/useAssociatedDataPanel'
import {
  dailyTrainDates,
  deriveSizingWindows,
  deriveSlotPeriodLabel,
  monthlyTrainMonths,
} from '../periodWindows'
import { AD_TAB_LABELS, formatNumber } from './associated-data/adTypes'
import AdTmsSummary from './associated-data/AdTmsSummary.vue'
import AssociatedDataEditorDialog from './associated-data/AssociatedDataEditorDialog.vue'

const props = defineProps<{
  exerciseId: string
  sizingMonth: string
  slotStartDate: string
  slotWeeks: number
  readOnly?: boolean
}>()

const {
  tabs,
  activeTab,
  loading,
  teamSetup,
  shifts,
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
  reapplyTemplate,
  onCycleTimeUpdated,
  reload,
} = useAssociatedDataPanel(() => props.exerciseId)

const supportFte = computed(() => {
  if (!support.value.length) return null
  return support.value.reduce((sum, item) => sum + (Number(item.supportFte) || 0), 0)
})

const supportAnnualHours = computed(() => {
  if (!support.value.length) return null
  return support.value.reduce((sum, item) => sum + (Number(item.workloadPerYearHours) || 0), 0)
})

const templateSourceLabel = computed(() => {
  const source = calendar.value?.baselineSource
  const version = calendar.value?.sourceTemplateVersion
  if (!source) return '—'
  if (version != null) return `${source} v${version}`
  return source
})

const volumeSummary = computed(() => {
  const sizing = deriveSizingWindows(props.sizingMonth)
  const monthVolume = monthly.value.reduce(
    (sum, row) => sum + Number(row.actualVolume ?? 0),
    0,
  )
  const dayVolume = daily.value.reduce(
    (sum, row) => sum + Number(row.actualVolume ?? 0),
    0,
  )
  const slotVolume = slot.value.reduce((sum, row) => sum + Number(row.actualVolume || 0), 0)
  return [
    {
      granularity: 'Month',
      period: sizing.monthTrain,
      volume: monthly.value.length ? formatNumber(monthVolume, 2) : '—',
      rows: `${monthly.value.length || monthlyTrainMonths(props.sizingMonth).length} train months`,
    },
    {
      granularity: 'Daily',
      period: sizing.dailyTrain,
      volume: daily.value.length ? formatNumber(dayVolume, 2) : '—',
      rows: `${daily.value.length || dailyTrainDates(props.sizingMonth).length} train days`,
    },
    {
      granularity: 'Slot',
      period: deriveSlotPeriodLabel(props.slotStartDate, props.slotWeeks),
      volume: slot.value.length ? formatNumber(slotVolume, 2) : '—',
      rows: `${slot.value.length} train slots`,
    },
  ]
})

defineExpose({
  getShifts: () => shifts.value,
  reload,
})
</script>

<template>
  <Card>
    <CardHeader class="items-center">
      <div>
        <CardTitle class="text-base">Associated Data</CardTitle>
        <p class="mt-1 text-xs text-muted-foreground">
          Shared by all scenarios in this exercise. Seeded from the last Approved archive for this
          Toolkit.
        </p>
      </div>
      <CardAction>
        <Button size="sm" :disabled="loading" @click="openEditor(activeTab)">
          {{ readOnly ? 'View' : 'Edit' }}
        </Button>
      </CardAction>
    </CardHeader>

    <div class="flex gap-1 border-b px-4">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        class="border-b-2 px-3.5 py-2 text-sm transition-colors"
        :class="
          activeTab === tab
            ? 'border-primary font-semibold text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        "
        @click="activeTab = tab"
      >
        {{ AD_TAB_LABELS[tab] }}
      </button>
    </div>

    <CardContent>
      <p v-if="loading" class="py-6 text-center text-sm text-muted-foreground">Loading…</p>

      <template v-else-if="activeTab === 'team'">
        <div class="overflow-x-auto rounded-lg border">
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
                <TableCell>Daily capacity / agent</TableCell>
                <TableCell>{{ formatNumber(teamSetup?.dailyCapacityPerAgent, 2) }}</TableCell>
                <TableCell class="text-muted-foreground">
                  Calculated from baseline inputs
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Working days</TableCell>
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
          :exercise-id="exerciseId"
          :read-only="readOnly"
        />
      </template>

      <template v-else-if="activeTab === 'support'">
        <div class="overflow-x-auto rounded-lg border">
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
                <TableCell>Total support FTE</TableCell>
                <TableCell>
                  {{ supportFte != null ? formatNumber(supportFte, 2) : '—' }}
                </TableCell>
                <TableCell class="text-muted-foreground">Summed from registry</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Annual support hours</TableCell>
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
        <div
          v-if="!readOnly && calendar?.templateUpdateAvailable"
          class="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <p>
            {{
              calendar.templateUpdateMessage ||
              'A newer Center holiday template is available.'
            }}
          </p>
          <Button size="sm" class="mt-2" variant="outline" @click="reapplyTemplate">
            Apply template
          </Button>
        </div>
        <div v-if="!readOnly" class="mb-2.5 flex justify-end">
          <Button size="sm" variant="outline" @click="reapplyTemplate">
            Re-apply template
          </Button>
        </div>
        <table class="w-full border-collapse text-sm">
          <tbody>
            <tr class="border-b">
              <td class="w-[32%] py-2 text-muted-foreground">Template source</td>
              <td class="py-2">{{ templateSourceLabel }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 text-muted-foreground">Weekend</td>
              <td class="py-2">{{ calendar?.weekendCode || '—' }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 text-muted-foreground">Working days / year</td>
              <td class="py-2">{{ formatNumber(calendar?.workingDaysPerYear, 2) }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 text-muted-foreground">Holiday days</td>
              <td class="py-2">{{ calendar?.holidays.length ?? 0 }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <template v-else>
        <div class="overflow-x-auto rounded-lg border">
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
    :exercise-id="exerciseId"
    :sizing-month="sizingMonth"
    :slot-start-date="slotStartDate"
    :slot-weeks="slotWeeks"
    :team-setup="teamSetup"
    :support="support"
    :calendar="calendar"
    :monthly="monthly"
    :daily="daily"
    :slot="slot"
    :cycle-time="cycleTime"
    :median-source="medianSource"
    :read-only="readOnly"
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
