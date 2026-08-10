<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { exerciseApi } from '../api'
import type {
  CalendarView,
  CycleTimeBaseline,
  DailyVolume,
  MonthlyVolume,
  Shift,
  SlotVolume,
  SupportItem,
  TeamSetup,
} from '../types'
import type { AdTab, MedianSourceMode } from './associated-data/adTypes'
import { AD_TAB_LABELS, formatNumber } from './associated-data/adTypes'
import AdTmsSummary from './associated-data/AdTmsSummary.vue'
import AssociatedDataEditorDialog from './associated-data/AssociatedDataEditorDialog.vue'

const props = defineProps<{
  exerciseId: string
  readOnly?: boolean
}>()

const tabs: AdTab[] = ['team', 'tms', 'support', 'calendar', 'volume']
const activeTab = ref<AdTab>('team')
const loading = ref(true)
const teamSetup = ref<TeamSetup | null>(null)
const shifts = ref<Shift[]>([])
const support = ref<SupportItem[]>([])
const calendar = ref<CalendarView | null>(null)
const monthly = ref<MonthlyVolume[]>([])
const daily = ref<DailyVolume[]>([])
const slot = ref<SlotVolume[]>([])
const cycleTime = ref<CycleTimeBaseline | null>(null)

const editorOpen = ref(false)
const editor = ref<AdTab | null>(null)

const medianSource = ref<MedianSourceMode>('system')
const manualMedian = ref('')
const manualReason = ref('')
const applyingManual = ref(false)

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
  const monthPeriod = periodLabel(
    monthly.value.map((r) => r.month),
    (m) => m,
  )
  const monthVolume = monthly.value.reduce(
    (sum, row) => sum + Number(row.manualForecastVolume ?? row.actualVolume ?? 0),
    0,
  )
  const dayPeriod = periodLabel(
    daily.value.map((r) => r.volumeDate),
    (d) => d,
  )
  const dayVolume = daily.value.reduce(
    (sum, row) => sum + Number(row.manualForecastVolume ?? row.actualVolume ?? 0),
    0,
  )
  const slotPeriod = slot.value.length
    ? `${slot.value[0].slotStartAt.slice(0, 16)} …`
    : '—'
  const slotVolume = slot.value.reduce((sum, row) => sum + Number(row.rawVolume || 0), 0)
  return [
    {
      granularity: 'Month',
      period: monthPeriod || '—',
      volume: monthly.value.length ? formatNumber(monthVolume) : '—',
    },
    {
      granularity: 'Daily',
      period: dayPeriod || '—',
      volume: daily.value.length ? formatNumber(dayVolume) : '—',
    },
    {
      granularity: 'Slot',
      period: slotPeriod,
      volume: slot.value.length ? formatNumber(slotVolume) : '—',
    },
  ]
})

function periodLabel(values: string[], format: (v: string) => string) {
  if (!values.length) return ''
  const sorted = [...values].sort()
  if (sorted.length === 1) return format(sorted[0])
  return `${format(sorted[0])}–${format(sorted[sorted.length - 1])}`
}

async function load() {
  loading.value = true
  try {
    const [ts, sh, sp, cal, mon, day, sl] = await Promise.all([
      exerciseApi.getTeamSetup(props.exerciseId),
      exerciseApi.getShifts(props.exerciseId),
      exerciseApi.listSupport(props.exerciseId),
      exerciseApi.getCalendar(props.exerciseId),
      exerciseApi.getMonthlyVolumes(props.exerciseId),
      exerciseApi.getDailyVolumes(props.exerciseId),
      exerciseApi.getSlotVolumes(props.exerciseId),
    ])
    teamSetup.value = ts
    shifts.value = sh
    support.value = sp
    calendar.value = cal
    monthly.value = mon
    daily.value = day
    slot.value = sl
    try {
      cycleTime.value = await exerciseApi.getActiveCycleTime(props.exerciseId)
    } catch {
      cycleTime.value = null
    }
    syncMedianFromBaseline()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load Associated Data.')
  } finally {
    loading.value = false
  }
}

function syncMedianFromBaseline() {
  const ct = cycleTime.value
  if (!ct) {
    medianSource.value = 'system'
    manualMedian.value = ''
    manualReason.value = ''
    return
  }
  if (ct.baselineType?.toUpperCase() === 'MANUAL') {
    medianSource.value = 'manual'
    manualMedian.value = String(ct.medianSeconds)
    manualReason.value = ct.manualReason ?? ''
  } else {
    medianSource.value = 'system'
    manualMedian.value = ''
    manualReason.value = ''
  }
}

function openEditor(kind: AdTab) {
  editor.value = kind
  editorOpen.value = true
}

async function reapplyTemplate() {
  try {
    const result = await exerciseApi.reapplyHolidayTemplate(props.exerciseId)
    const cal = result.calendar
    // Replace refs with fresh objects so summary + open editor stay in sync.
    calendar.value = { ...cal, holidays: [...(cal.holidays ?? [])] }
    teamSetup.value = await exerciseApi.getTeamSetup(props.exerciseId)
    const count = cal.holidays?.length ?? 0
    toast.success(
      `Template applied (${count} holiday day${count === 1 ? '' : 's'}). CUSTOM rows kept.`,
    )
    for (const notice of result.notices ?? []) {
      toast.message(notice)
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not re-apply template.')
  }
}

async function applyManualBaseline() {
  const seconds = Number(manualMedian.value)
  if (!seconds || !manualReason.value.trim()) {
    toast.warning('Median seconds and reason are required for manual baseline.')
    return
  }
  applyingManual.value = true
  try {
    cycleTime.value = await exerciseApi.createManualCycleTime(props.exerciseId, {
      medianSeconds: seconds,
      manualReason: manualReason.value.trim(),
    })
    toast.success('Manual median baseline saved.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not save manual baseline.')
  } finally {
    applyingManual.value = false
  }
}

watch(
  () => props.exerciseId,
  () => {
    void load()
  },
)

onMounted(load)

defineExpose({
  getShifts: () => shifts.value,
  reload: load,
})
</script>

<template>
  <Card>
    <CardHeader class="gap-3">
      <div>
        <CardTitle class="text-base">Associated Data</CardTitle>
        <p class="mt-1 text-xs text-muted-foreground">
          Shared by all scenarios in this exercise. Seeded from the last Approved archive for this
          Toolkit.
        </p>
      </div>
      <div class="flex gap-1 border-b">
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
    </CardHeader>

    <CardContent>
      <p v-if="loading" class="py-6 text-center text-sm text-muted-foreground">Loading…</p>

      <template v-else-if="activeTab === 'team'">
        <div class="mb-2.5 flex justify-end">
          <Button size="sm" variant="outline" @click="openEditor('team')">
            {{ readOnly ? 'View' : 'Edit' }}
          </Button>
        </div>
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
                <TableCell>{{ formatNumber(teamSetup?.dailyCapacityPerAgent) }}</TableCell>
                <TableCell class="text-muted-foreground">
                  Calculated from baseline inputs
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Working days</TableCell>
                <TableCell>{{ formatNumber(teamSetup?.workingDaysPerYear) }}</TableCell>
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
          v-model:manual-median="manualMedian"
          v-model:reason="manualReason"
          :cycle-time="cycleTime"
          :read-only="readOnly"
          @edit="openEditor('tms')"
        />
        <div
          v-if="!readOnly && medianSource === 'manual'"
          class="mt-3 flex justify-end"
        >
          <Button size="sm" :disabled="applyingManual" @click="applyManualBaseline">
            {{ applyingManual ? 'Saving…' : 'Apply manual baseline' }}
          </Button>
        </div>
      </template>

      <template v-else-if="activeTab === 'support'">
        <div class="mb-2.5 flex justify-end">
          <Button size="sm" variant="outline" @click="openEditor('support')">
            {{ readOnly ? 'View' : 'Edit' }}
          </Button>
        </div>
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
                    supportAnnualHours != null ? formatNumber(supportAnnualHours, 1) : '—'
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
            Apply published template
          </Button>
        </div>
        <div class="mb-2.5 flex justify-end gap-2">
          <Button
            v-if="!readOnly"
            size="sm"
            variant="outline"
            @click="reapplyTemplate"
          >
            Re-apply template
          </Button>
          <Button size="sm" variant="outline" @click="openEditor('calendar')">
            {{ readOnly ? 'View' : 'Edit' }}
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
              <td class="py-2">{{ formatNumber(calendar?.workingDaysPerYear) }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 text-muted-foreground">Holiday days</td>
              <td class="py-2">{{ calendar?.holidays.length ?? 0 }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <template v-else>
        <div class="mb-2.5 flex justify-end">
          <Button size="sm" variant="outline" @click="openEditor('volume')">
            {{ readOnly ? 'View' : 'Edit' }}
          </Button>
        </div>
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
    :team-setup="teamSetup"
    :support="support"
    :calendar="calendar"
    :monthly="monthly"
    :daily="daily"
    :slot="slot"
    :cycle-time="cycleTime"
    :median-source="medianSource"
    :manual-median="manualMedian"
    :manual-reason="manualReason"
    :read-only="readOnly"
    @update:team-setup="teamSetup = $event"
    @update:support="support = $event"
    @update:calendar="calendar = $event"
    @update:monthly="monthly = $event"
    @update:daily="daily = $event"
    @update:slot="slot = $event"
    @update:cycle-time="cycleTime = $event"
    @close="editor = null"
  />
</template>
