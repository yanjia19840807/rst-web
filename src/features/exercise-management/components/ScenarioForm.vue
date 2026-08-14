<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NumberFieldControl } from '@/components/ui/number-field'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { TimePicker } from '@/components/ui/time-picker'
import { formatMonth } from '@/lib/datetime'

import { exerciseApi } from '../api'
import { deriveSlotPeriodLabel } from '../periodWindows'
import type {
  CycleTimeBaseline,
  DailySizingView,
  Exercise,
  ForecastBundle,
  MonthlySizingView,
  Scenario,
  SlotSimulationView,
  SupportItem,
  TeamSetup,
} from '../types'

/** Editable shift row; new Add rows start empty until filled. */
type ShiftDraft = {
  shiftNo: number
  startTime: string
  durationMinutes: number | null
  headcount: number | null
  worksOnWeekend: boolean
}
import ScenarioResultsPanel from './ScenarioResultsPanel.vue'
import type { ScenarioResultRow } from './ScenarioResultsPanel.vue'
import SizingSimulationCharts from './SizingSimulationCharts.vue'
import SlotSimulationCharts from './SlotSimulationCharts.vue'
import ToolkitInfoDialog from './ToolkitInfoDialog.vue'

const props = defineProps<{
  exerciseId: string
  scenarioId: string
}>()

const route = useRoute()
const router = useRouter()
const snapshotMode = computed(() => route.name === 'supervisor-scenario-snapshot')
const loading = ref(true)
const busy = ref(false)
const deleteOpen = ref(false)
const deletePending = ref(false)
const toolkitInfoOpen = ref(false)
const exercise = ref<Exercise | null>(null)
const scenario = ref<Scenario | null>(null)
const teamSetup = ref<TeamSetup | null>(null)
const support = ref<SupportItem[]>([])
const cycleTime = ref<CycleTimeBaseline | null>(null)

const sizingCompleted = ref(false)
const slotCompleted = ref(false)
const latestForecastBundle = ref<ForecastBundle | null>(null)
const latestMonthlySizing = ref<MonthlySizingView | null>(null)
const latestDailySizing = ref<DailySizingView | null>(null)
const latestSlotSimulation = ref<SlotSimulationView | null>(null)

const form = reactive({
  name: '',
  description: '',
  rightSizingHc: 0 as number,
})

const shiftRows = ref<ShiftDraft[]>([])

const readOnly = computed(
  () => !exercise.value?.canEdit || scenario.value?.status === 'OFFICIAL',
)

const periodHint = computed(() => {
  if (!exercise.value) return ''
  const month = formatMonth(exercise.value.sizingMonth)
  const slot = deriveSlotPeriodLabel(exercise.value.slotStartDate, exercise.value.slotWeeks)
  return `${month} · ${slot}`
})

const supportFte = computed(() => {
  if (!support.value.length) return null
  return support.value.reduce((sum, item) => sum + (Number(item.supportFte) || 0), 0)
})

const deliveryHc = computed(() =>
  (exercise.value?.snapshot.sharedKpis ?? []).reduce(
    (sum, item) => sum + Number(item.deliveryHc),
    0,
  ),
)

const shiftSetupLabel = computed(() => {
  const n = shiftRows.value.length
  return n === 1 ? '1 shift' : `${n} shifts`
})

const medianLabel = computed(() =>
  cycleTime.value ? `${Number(cycleTime.value.medianSeconds).toFixed(2)}s` : '—',
)

const medianSourceLabel = computed(() => {
  if (!cycleTime.value) return '—'
  return cycleTime.value.baselineType?.toUpperCase() === 'MANUAL'
    ? 'Manual median input'
    : 'System-calculated median'
})

const slaTargetLabel = computed(() => {
  const ratio = teamSetup.value?.slaTargetRatio
  if (ratio == null) return '—'
  return `${(Number(ratio) * 100).toFixed(2)}%`
})

const slaTurntimeLabel = computed(() => {
  const minutes = teamSetup.value?.slaTurnaroundMinutes
  if (minutes == null) return '—'
  const hours = Number(minutes) / 60
  return `${hours.toFixed(2)} business hours`
})

const workingDaysLabel = computed(() => {
  const days = teamSetup.value?.workingDaysPerYear
  return days != null ? Number(days).toFixed(2) : '—'
})

const dailyCapacityLabel = computed(() => {
  const cap = teamSetup.value?.dailyCapacityPerAgent
  return cap != null ? Number(cap).toFixed(2) : '—'
})

/** Exercise AD / snapshot inputs used by simulation (read-only on this page). */
const baselineInputRows = computed(() => [
  { label: 'Delivery HC', value: deliveryHc.value.toFixed(2) },
  { label: 'Median Cycle Time', value: medianLabel.value },
  { label: 'Median source', value: medianSourceLabel.value },
  {
    label: 'Production support',
    value: supportFte.value != null ? supportFte.value.toFixed(2) : '—',
  },
  { label: 'SLA Turntime', value: slaTurntimeLabel.value },
  { label: 'SLA Target %', value: slaTargetLabel.value },
  { label: 'Working days / year', value: workingDaysLabel.value },
  { label: 'Daily capacity / agent', value: dailyCapacityLabel.value },
])

/**
 * Outcome metrics only: simulation outputs and values derived from them
 * (inputs live in Scenario Info).
 */
const resultRows = computed<ScenarioResultRow[]>(() => {
  const rsHc = Number(form.rightSizingHc)
  const supportVal = supportFte.value
  const capacity =
    Number.isFinite(rsHc) && supportVal != null
      ? deliveryHc.value - rsHc - supportVal
      : null
  const capacityLabel =
    capacity == null ? '—' : `${capacity >= 0 ? '+' : ''}${capacity.toFixed(2)}`

  const firstSizing = latestMonthlySizing.value?.rows[0]
  const rows: ScenarioResultRow[] = [
    { label: 'Actual size', value: deliveryHc.value.toFixed(2) },
    {
      label: 'Right size HC',
      value: firstSizing
        ? Number(firstSizing.rightSizingHc).toFixed(2)
        : Number.isFinite(form.rightSizingHc)
          ? form.rightSizingHc.toFixed(2)
          : '—',
    },
    {
      label: 'Capacity Creation',
      value: firstSizing
        ? `${Number(firstSizing.capacityCreation) >= 0 ? '+' : ''}${Number(firstSizing.capacityCreation).toFixed(2)}`
        : capacityLabel,
      emphasize: firstSizing
        ? Number(firstSizing.capacityCreation) >= 0
          ? 'good'
          : 'bad'
        : capacity == null
          ? null
          : capacity >= 0
            ? 'good'
            : 'bad',
    },
    { label: 'Shift Setup', value: shiftSetupLabel.value },
  ]

  if (firstSizing) {
    rows.splice(1, 0, {
      label: 'Nominal HC (w/o OT)',
      value: String(Number(firstSizing.nominalHcWithoutOt).toFixed(2)),
    })
  }
  if (latestMonthlySizing.value?.calculationVersion) {
    rows.unshift({
      label: 'Sizing version',
      value: latestMonthlySizing.value.calculationVersion,
    })
  }
  if (latestDailySizing.value?.rows?.length) {
    const endBacklog =
      latestDailySizing.value.rows[latestDailySizing.value.rows.length - 1]?.backlogEnd
    rows.push({
      label: 'Daily sim days',
      value: String(latestDailySizing.value.rows.length),
    })
    if (endBacklog != null) {
      rows.push({ label: 'End backlog', value: String(endBacklog) })
    }
  }

  if (slotCompleted.value && latestSlotSimulation.value) {
    const tatPct = Number(latestSlotSimulation.value.tatOnPeriod) * 100
    const actualVsPct = Number(latestSlotSimulation.value.actualVsTheoretical) * 100
    const target = latestSlotSimulation.value.slaTargetRatio
    const tatBad = target != null && Number(latestSlotSimulation.value.tatOnPeriod) < Number(target)
    rows.push(
      {
        label: 'TAT on period',
        value: `${tatPct.toFixed(2)}%`,
        emphasize: tatBad ? 'bad' : 'good',
      },
      {
        label: 'Actual vs theoretical',
        value: `${actualVsPct.toFixed(0)}%`,
      },
    )
  }

  return rows
})

const slotLocked = computed(() => !sizingCompleted.value)

watch(
  () => form.rightSizingHc,
  () => {
    if (sizingCompleted.value || slotCompleted.value) {
      // HC change invalidates preview results until user re-runs.
      sizingCompleted.value = false
      slotCompleted.value = false
      latestForecastBundle.value = null
      latestMonthlySizing.value = null
      latestDailySizing.value = null
      latestSlotSimulation.value = null
    }
  },
)

async function load() {
  loading.value = true
  try {
    ;[exercise.value, scenario.value] = await Promise.all([
      exerciseApi.detail(props.exerciseId),
      exerciseApi.getScenario(props.exerciseId, props.scenarioId),
    ])
    form.name = scenario.value.name
    form.description = scenario.value.description ?? ''
    const rs = scenario.value.assumptions.find((a) => a.parameterCode === 'RIGHT_SIZING_HC')
    form.rightSizingHc = rs?.numericValue != null ? Number(rs.numericValue) : 0

    const [ts, sp] = await Promise.all([
      exerciseApi.getTeamSetup(props.exerciseId).catch(() => null),
      exerciseApi.listSupport(props.exerciseId).catch(() => [] as SupportItem[]),
    ])
    teamSetup.value = ts
    support.value = sp
    try {
      cycleTime.value = await exerciseApi.getActiveCycleTime(props.exerciseId)
    } catch {
      cycleTime.value = null
    }

    const savedShifts = scenario.value.shifts ?? []
    shiftRows.value = savedShifts.length
      ? savedShifts.map((s) => ({
          shiftNo: s.shiftNo,
          startTime: s.startTime.length === 5 ? `${s.startTime}:00` : s.startTime,
          durationMinutes: s.durationMinutes,
          headcount: Number(s.headcount),
          worksOnWeekend: s.worksOnWeekend,
        }))
      : [
          {
            shiftNo: 1,
            startTime: '',
            durationMinutes: null,
            headcount: null,
            worksOnWeekend: false,
          },
        ]

    // Reload only previously committed (Save) simulation outputs.
    await loadSimulationResults()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load scenario.')
    goBack()
  } finally {
    loading.value = false
  }
}

async function loadSimulationResults() {
  sizingCompleted.value = false
  slotCompleted.value = false
  latestForecastBundle.value = null
  latestMonthlySizing.value = null
  latestDailySizing.value = null
  latestSlotSimulation.value = null

  const [monthlySizing, dailySizing, monthlyForecast, dailyForecast] = await Promise.all([
    exerciseApi.getLatestMonthlySizing(props.exerciseId, props.scenarioId).catch(() => null),
    exerciseApi.getLatestDailySimulation(props.exerciseId, props.scenarioId).catch(() => null),
    exerciseApi.getLatestForecast(props.exerciseId, props.scenarioId, 'MONTHLY').catch(() => null),
    exerciseApi.getLatestForecast(props.exerciseId, props.scenarioId, 'DAILY').catch(() => null),
  ])

  latestMonthlySizing.value = monthlySizing
  latestDailySizing.value = dailySizing
  if (monthlyForecast && dailyForecast) {
    latestForecastBundle.value = { monthly: monthlyForecast, daily: dailyForecast }
  }

  const hasSizing =
    (monthlySizing?.rows?.length ?? 0) > 0 &&
    (dailySizing?.rows?.length ?? 0) > 0 &&
    latestForecastBundle.value != null
  sizingCompleted.value = hasSizing

  if (!hasSizing) return

  const slot = await exerciseApi
    .getLatestSlotSimulation(props.exerciseId, props.scenarioId)
    .catch(() => null)
  latestSlotSimulation.value = slot
  slotCompleted.value = slot != null && (slot.rows?.length ?? 0) > 0
}

function isBlankShift(row: ShiftDraft) {
  return !row.startTime?.trim() && row.durationMinutes == null && row.headcount == null
}

function toShiftRequests() {
  return shiftRows.value
    .filter((row) => !isBlankShift(row))
    .map((row, index) => ({
      shiftNo: index + 1,
      startTime: row.startTime.length === 5 ? `${row.startTime}:00` : row.startTime,
      durationMinutes: Number(row.durationMinutes),
      headcount: Number(row.headcount),
      worksOnWeekend: row.worksOnWeekend,
    }))
}

function addShift() {
  if (slotLocked.value || readOnly.value) return
  shiftRows.value.push({
    shiftNo: shiftRows.value.length + 1,
    startTime: '',
    durationMinutes: null,
    headcount: null,
    worksOnWeekend: false,
  })
  slotCompleted.value = false
  latestSlotSimulation.value = null
}

function removeShift() {
  if (slotLocked.value || readOnly.value || shiftRows.value.length <= 1) return
  shiftRows.value.pop()
  shiftRows.value.forEach((row, index) => {
    row.shiftNo = index + 1
  })
  slotCompleted.value = false
}

function onShiftEdited() {
  if (slotCompleted.value) {
    slotCompleted.value = false
    latestSlotSimulation.value = null
  }
}

async function save() {
  if (!scenario.value || readOnly.value) return
  const shiftError = validateShiftDrafts(false)
  if (shiftError) {
    toast.warning(shiftError)
    return
  }
  busy.value = true
  try {
    const hasSizingResults =
      sizingCompleted.value &&
      latestForecastBundle.value != null &&
      latestMonthlySizing.value != null &&
      latestDailySizing.value != null
    scenario.value = await exerciseApi.commitScenario(props.exerciseId, props.scenarioId, {
      name: form.name.trim() || scenario.value.scenarioCode,
      description: form.description.trim() || null,
      assumptions: [
        {
          parameterCode: 'RIGHT_SIZING_HC',
          numericValue: Number(form.rightSizingHc),
          unit: 'HC',
        },
      ],
      shifts: toShiftRequests(),
      results: hasSizingResults
        ? {
            forecast: latestForecastBundle.value!,
            monthly: latestMonthlySizing.value!,
            daily: latestDailySizing.value!,
            slot: slotCompleted.value ? latestSlotSimulation.value : null,
          }
        : null,
    })
    toast.success('Scenario saved.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Save failed.')
  } finally {
    busy.value = false
  }
}

async function runSizing() {
  if (readOnly.value || busy.value) return
  const hc = Number(form.rightSizingHc)
  if (!Number.isFinite(hc) || hc <= 0) {
    toast.warning('Right Sizing HC must be a positive number.')
    return
  }
  busy.value = true
  try {
    const preview = await exerciseApi.previewSizing(props.exerciseId, props.scenarioId, hc)
    latestForecastBundle.value = preview.forecast
    latestMonthlySizing.value = preview.monthly
    latestDailySizing.value = preview.daily
    sizingCompleted.value = true
    slotCompleted.value = false
    latestSlotSimulation.value = null
    const method = preview.forecast.monthly?.method ?? 'forecast'
    toast.success(
      `Sizing preview ready (${method}, ${preview.monthly.rows.length} months, ${preview.daily.rows.length} days). Save to keep.`,
    )
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Sizing simulation failed.')
  } finally {
    busy.value = false
  }
}

function validateShiftDrafts(requireAtLeastOne: boolean): string | null {
  const filled = shiftRows.value.filter((row) => !isBlankShift(row))
  if (requireAtLeastOne && !filled.length) return 'Add at least one shift.'
  for (const row of filled) {
    if (!row.startTime?.trim()) {
      return `Shift ${row.shiftNo}: Start time is required.`
    }
    if (row.durationMinutes == null || !Number.isFinite(row.durationMinutes) || row.durationMinutes <= 0) {
      return `Shift ${row.shiftNo}: Duration (minutes) must be a positive number.`
    }
    if (row.headcount == null || !Number.isFinite(row.headcount) || row.headcount < 0) {
      return `Shift ${row.shiftNo}: Capacity FTE must be zero or greater.`
    }
  }
  return null
}

async function runSlot() {
  if (readOnly.value || busy.value || slotLocked.value) return
  const validationError = validateShiftDrafts(true)
  if (validationError) {
    toast.warning(validationError)
    return
  }
  busy.value = true
  try {
    latestSlotSimulation.value = await exerciseApi.runSlotSimulation(
      props.exerciseId,
      props.scenarioId,
      toShiftRequests(),
    )
    slotCompleted.value = true
    const tatPct = (Number(latestSlotSimulation.value.tatOnPeriod) * 100).toFixed(2)
    toast.success(
      `Slot preview ready (${latestSlotSimulation.value.rows.length} slots, TAT ${tatPct}%). Save to keep.`,
    )
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Slot simulation failed.')
  } finally {
    busy.value = false
  }
}

async function confirmDelete() {
  deletePending.value = true
  try {
    await exerciseApi.deleteScenario(props.exerciseId, props.scenarioId)
    toast.success('Scenario deleted.')
    void router.push({ name: 'supervisor-exercise-detail', params: { id: props.exerciseId } })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Delete failed.')
  } finally {
    deletePending.value = false
    deleteOpen.value = false
  }
}

function goBack() {
  void router.push({
    name: snapshotMode.value ? 'supervisor-exercise-snapshot' : 'supervisor-exercise-detail',
    params: { id: props.exerciseId },
  })
}

function formatShiftTime(value?: string | null) {
  if (!value) return '—'
  return value.length >= 5 ? value.slice(0, 5) : value
}

const scenarioInfoRows = computed(() => {
  const rows = [
    { key: 'toolkit', label: 'Toolkit', value: exercise.value?.snapshot.toolkit.name },
    { label: 'Exercise No', value: exercise.value?.exerciseCode },
    { label: 'Scenario No.', value: scenario.value?.scenarioCode },
    { label: 'Status', value: scenario.value?.status },
  ]
  if (readOnly.value) {
    rows.push(
      { label: 'Name', value: form.name },
      { label: 'Description', value: form.description },
    )
  }
  return rows
})

onMounted(load)
</script>

<template>
  <div v-if="loading" class="py-16 text-center text-sm text-muted-foreground">
    Loading scenario…
  </div>
  <div v-else-if="exercise && scenario" class="grid gap-4">
    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="goBack"
        >
          {{ snapshotMode ? '← Back to Exercise Snapshot' : '← Back to Exercise' }}
        </Button>
      </template>
      <Button v-if="!readOnly" variant="destructive" @click="deleteOpen = true">
        Delete Scenario
      </Button>
      <Button v-if="!readOnly" :disabled="busy" @click="save">
        {{ busy ? 'Saving…' : 'Save Scenario' }}
      </Button>
    </PageActions>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Scenario Info</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-3">
        <DetailTable :rows="scenarioInfoRows">
          <template #toolkit="{ row }">
            <span class="inline-flex items-center gap-1.5">
              <span>{{ row.value || '—' }}</span>
              <button
                type="button"
                class="inline-flex size-5 items-center justify-center rounded text-primary hover:bg-primary/10"
                title="Toolkit info"
                @click="toolkitInfoOpen = true"
              >
                <Info class="size-3.5" />
                <span class="sr-only">Toolkit info</span>
              </button>
            </span>
          </template>
        </DetailTable>

        <div v-if="!readOnly" class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm sm:col-span-2">
            Name
            <Input v-model="form.name" />
          </label>
          <label class="grid gap-1 text-sm sm:col-span-2">
            Description
            <Textarea v-model="form.description" rows="2" />
          </label>
        </div>

        <div class="rounded-lg border bg-card p-3.5">
          <div class="mb-2 flex items-baseline justify-between gap-2">
            <h3 class="text-sm font-bold">Baseline inputs (from Exercise)</h3>
            <span class="text-xs text-muted-foreground">Read-only · edit on Exercise</span>
          </div>
          <DetailTable :rows="baselineInputRows" />
        </div>

        <div class="rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          Sizing Month, Slot Period, TMS period, and Associated Data are maintained on the Exercise
          ({{ periodHint }}). This scenario only adjusts assumptions and runs simulation.
        </div>
      </CardContent>
    </Card>

    <ToolkitInfoDialog v-model:open="toolkitInfoOpen" :snapshot="exercise.snapshot" />

    <div class="grid items-start gap-3.5 lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)]">
      <div class="grid min-w-0 gap-3.5">
        <!-- Sizing Simulation Panel -->
        <section class="rounded-lg border bg-card p-4">
          <h3 class="mb-3 text-base font-bold">1. Sizing Simulation</h3>
          <div class="mb-3.5 rounded-lg border bg-card p-4">
            <div class="mb-3 flex items-center justify-between gap-2">
              <h4 class="text-sm font-bold">Sizing Inputs</h4>
              <Button
                v-if="!readOnly"
                size="sm"
                :disabled="busy"
                @click="runSizing"
              >
                Run Simulation
              </Button>
            </div>
            <DetailTable
              v-if="readOnly"
              :rows="[{ label: 'Right Sizing HC', value: Number.isFinite(form.rightSizingHc) ? form.rightSizingHc.toFixed(2) : '—' }]"
            />
            <label v-else class="grid max-w-xs gap-1 text-sm">
              Right Sizing HC
              <NumberFieldControl
                v-model="form.rightSizingHc"
                :min="0"
              />
            </label>
          </div>

          <SizingSimulationCharts
            v-if="sizingCompleted"
            :monthly="latestMonthlySizing"
            :daily="latestDailySizing"
            :sla-target-ratio="teamSetup?.slaTargetRatio ?? null"
          />
          <div
            v-else
            class="rounded-md border border-dashed px-3 py-10 text-center text-sm text-muted-foreground"
          >
            {{
              readOnly
                ? 'No saved sizing simulation for this scenario.'
                : 'Run Sizing Simulation to generate forecast and simulation results.'
            }}
          </div>
        </section>

        <!-- Slot Simulation Panel -->
        <section
          class="rounded-lg border bg-card p-4"
          :class="!readOnly && slotLocked ? 'opacity-60' : undefined"
        >
          <h3 class="mb-1 text-base font-bold">2. Slot Simulation</h3>
          <p v-if="!readOnly && slotLocked" class="mb-3 text-xs text-muted-foreground">
            Run Sizing Simulation first to unlock Slot Simulation.
          </p>

          <div
            class="mb-3.5 rounded-lg border bg-card p-4"
            :class="!readOnly && slotLocked ? 'pointer-events-none' : undefined"
          >
            <div class="mb-3 flex items-center justify-between gap-2">
              <h4 class="text-sm font-bold">Shift Inputs</h4>
              <Button
                v-if="!readOnly"
                size="sm"
                :disabled="busy || slotLocked"
                @click="runSlot"
              >
                Run Simulation
              </Button>
            </div>

            <div v-if="!readOnly" class="mb-2.5 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="slotLocked"
                @click="addShift"
              >
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="slotLocked || shiftRows.length <= 1"
                @click="removeShift"
              >
                Remove
              </Button>
            </div>

            <div class="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead v-for="row in shiftRows" :key="row.shiftNo">
                      Shift {{ row.shiftNo }}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell class="text-muted-foreground">Start</TableCell>
                    <TableCell v-for="row in shiftRows" :key="`start-${row.shiftNo}`">
                      <span v-if="readOnly">{{ formatShiftTime(row.startTime) }}</span>
                      <TimePicker
                        v-else
                        v-model="row.startTime"
                        class="h-8"
                        :disabled="slotLocked"
                        :aria-label="`Shift ${row.shiftNo} start`"
                        @update:model-value="onShiftEdited"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell class="text-muted-foreground">Duration (min)</TableCell>
                    <TableCell v-for="row in shiftRows" :key="`dur-${row.shiftNo}`">
                      <span v-if="readOnly">{{ row.durationMinutes ?? '—' }}</span>
                      <NumberFieldControl
                        v-else
                        v-model="row.durationMinutes"
                        :min="1"
                        :disabled="slotLocked"
                        @update:model-value="onShiftEdited"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell class="text-muted-foreground">Capacity FTE</TableCell>
                    <TableCell v-for="row in shiftRows" :key="`hc-${row.shiftNo}`">
                      <span v-if="readOnly">{{ row.headcount ?? '—' }}</span>
                      <NumberFieldControl
                        v-else
                        v-model="row.headcount"
                        :min="0"
                        :disabled="slotLocked"
                        @update:model-value="onShiftEdited"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell class="text-muted-foreground">Weekend</TableCell>
                    <TableCell v-for="row in shiftRows" :key="`wk-${row.shiftNo}`">
                      <span v-if="readOnly">{{ row.worksOnWeekend ? 'Yes' : 'No' }}</span>
                      <Label v-else class="flex items-center gap-2 text-sm">
                        <input
                          v-model="row.worksOnWeekend"
                          type="checkbox"
                          :disabled="slotLocked"
                          @change="onShiftEdited"
                        />
                        Yes
                      </Label>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <section
            v-if="slotCompleted && latestSlotSimulation"
            class="rounded-lg border bg-card p-4"
          >
            <h4 class="mb-3 text-sm font-bold">Slot Simulation Result</h4>
            <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-md border px-3 py-2.5">
                <div class="text-xs text-muted-foreground">TAT on period</div>
                <div
                  class="mt-1 font-semibold"
                  :class="
                    latestSlotSimulation.slaTargetRatio != null &&
                    Number(latestSlotSimulation.tatOnPeriod) <
                      Number(latestSlotSimulation.slaTargetRatio)
                      ? 'text-destructive'
                      : undefined
                  "
                >
                  {{ (Number(latestSlotSimulation.tatOnPeriod) * 100).toFixed(2) }}%
                </div>
                <div class="mt-0.5 text-xs text-muted-foreground">
                  Target
                  {{
                    latestSlotSimulation.slaTargetRatio == null
                      ? '—'
                      : `${Math.round(Number(latestSlotSimulation.slaTargetRatio) * 100)}%`
                  }}
                </div>
              </div>
              <div class="rounded-md border px-3 py-2.5">
                <div class="text-xs text-muted-foreground">Actual vs theoretical</div>
                <div class="mt-1 font-semibold">
                  {{ (Number(latestSlotSimulation.actualVsTheoretical) * 100).toFixed(0) }}%
                </div>
                <div class="mt-0.5 text-xs text-muted-foreground">
                  sum(capacity) / sum(manual)
                </div>
              </div>
              <div class="rounded-md border px-3 py-2.5">
                <div class="text-xs text-muted-foreground">Shift setup</div>
                <div class="mt-1 font-semibold">{{ latestSlotSimulation.shiftCount }}</div>
                <div class="mt-0.5 text-xs text-muted-foreground">{{ shiftSetupLabel }}</div>
              </div>
              <div class="rounded-md border px-3 py-2.5">
                <div class="text-xs text-muted-foreground">Applicability</div>
                <div class="mt-1 font-semibold">
                  {{ latestSlotSimulation.applicability ? 'On' : 'Off' }}
                </div>
                <div class="mt-0.5 text-xs text-muted-foreground">
                  Calendar SLA &lt;= 24h or business-hours SLA &lt;= 8h
                </div>
              </div>
            </div>
            <SlotSimulationCharts :chart="latestSlotSimulation.chart" />
          </section>
        </section>
      </div>

      <ScenarioResultsPanel
        class="lg:sticky lg:top-4"
        :sizing-completed="sizingCompleted"
        :rows="resultRows"
      />
    </div>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete Scenario"
      description="Only DRAFT scenarios can be deleted. This cannot be undone."
      confirm-label="Delete Scenario"
      :pending="deletePending"
      @confirm="confirmDelete"
    />
  </div>
</template>
