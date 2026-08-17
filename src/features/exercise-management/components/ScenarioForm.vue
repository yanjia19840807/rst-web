<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatMonth } from '@/lib/datetime'

import { exerciseApi } from '../api'
import { useScenarioMutations } from '../api/mutations'
import {
  useCycleTimeActiveQuery,
  useExerciseQuery,
  useLatestDailySimulationQuery,
  useLatestForecastQuery,
  useLatestMonthlySizingQuery,
  useLatestSlotSimulationQuery,
  useScenarioQuery,
  useSupportQuery,
  useTeamSetupQuery,
} from '../api/queries'
import { deriveSlotPeriodLabel } from '../periodWindows'
import { scenarioMetadataSchema } from '../schemas/scenario'
import type {
  ForecastBundle,
  MonthlySizingView,
  DailySizingView,
  Scenario,
  SlotSimulationView,
} from '../types'
import ScenarioAssumptionsSection, { type ShiftDraft } from './ScenarioAssumptionsSection.vue'
import ScenarioResultsPanel from './ScenarioResultsPanel.vue'
import type { ScenarioResultRow } from './ScenarioResultsPanel.vue'
import ToolkitInfoDialog from './ToolkitInfoDialog.vue'

const props = defineProps<{
  exerciseId: string
  scenarioId: string
}>()

const route = useRoute()
const router = useRouter()
const { commitScenario, deleteScenario } = useScenarioMutations()
const snapshotMode = computed(() => route.name === 'supervisor-scenario-snapshot')
const busy = ref(false)
const deleteOpen = ref(false)
const deletePending = computed(() => deleteScenario.isPending.value)
const toolkitInfoOpen = ref(false)
const hydratedKey = ref('')

const exerciseQuery = useExerciseQuery(() => props.exerciseId)
const scenarioQuery = useScenarioQuery(() => props.exerciseId, () => props.scenarioId)
const teamSetupQuery = useTeamSetupQuery(() => props.exerciseId)
const supportQuery = useSupportQuery(() => props.exerciseId)
const cycleTimeQuery = useCycleTimeActiveQuery(() => props.exerciseId)
const monthlyQuery = useLatestMonthlySizingQuery(() => props.exerciseId, () => props.scenarioId)
const dailyQuery = useLatestDailySimulationQuery(() => props.exerciseId, () => props.scenarioId)
const monthlyForecastQuery = useLatestForecastQuery(
  () => props.exerciseId,
  () => props.scenarioId,
  'MONTHLY',
)
const dailyForecastQuery = useLatestForecastQuery(
  () => props.exerciseId,
  () => props.scenarioId,
  'DAILY',
)
const slotQuery = useLatestSlotSimulationQuery(() => props.exerciseId, () => props.scenarioId)

const exercise = computed(() => exerciseQuery.data.value ?? null)
const scenario = computed(() => scenarioQuery.data.value ?? null)
const teamSetup = computed(() => teamSetupQuery.data.value ?? null)
const support = computed(() => supportQuery.data.value ?? [])
const cycleTime = computed(() => cycleTimeQuery.data.value ?? null)

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
  { flush: 'sync' },
)

async function loadSimulationResultsFromQueries() {
  sizingCompleted.value = false
  slotCompleted.value = false
  latestForecastBundle.value = null
  latestMonthlySizing.value = null
  latestDailySizing.value = null
  latestSlotSimulation.value = null

  const monthlySizing = monthlyQuery.data.value ?? null
  const dailySizing = dailyQuery.data.value ?? null
  const monthlyForecast = monthlyForecastQuery.data.value ?? null
  const dailyForecast = dailyForecastQuery.data.value ?? null

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

  const slot = slotQuery.data.value ?? null
  latestSlotSimulation.value = slot
  slotCompleted.value = slot != null && (slot.rows?.length ?? 0) > 0
}

function applyScenarioToForm(value: Scenario) {
  form.name = value.name
  form.description = value.description ?? ''
  const rs = value.assumptions.find((a) => a.parameterCode === 'RIGHT_SIZING_HC')
  form.rightSizingHc = rs?.numericValue != null ? Number(rs.numericValue) : 0

  const savedShifts = value.shifts ?? []
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
}

const queriesReady = computed(() => {
  if (!exercise.value || !scenario.value) return false
  return (
    !teamSetupQuery.isPending.value &&
    !supportQuery.isPending.value &&
    !cycleTimeQuery.isPending.value &&
    !monthlyQuery.isPending.value &&
    !dailyQuery.isPending.value &&
    !monthlyForecastQuery.isPending.value &&
    !dailyForecastQuery.isPending.value &&
    !slotQuery.isPending.value
  )
})

const currentKey = computed(() => `${props.exerciseId}:${props.scenarioId}`)
const loading = computed(() => hydratedKey.value !== currentKey.value)

watch(currentKey, () => {
  hydratedKey.value = ''
  sizingCompleted.value = false
  slotCompleted.value = false
  latestForecastBundle.value = null
  latestMonthlySizing.value = null
  latestDailySizing.value = null
  latestSlotSimulation.value = null
})

watch(
  [queriesReady, currentKey],
  ([ready, key]) => {
    if (!ready || !scenario.value || hydratedKey.value === key) return
    applyScenarioToForm(scenario.value)
    loadSimulationResultsFromQueries()
    hydratedKey.value = key
  },
  { immediate: true },
)

watch(
  () => exerciseQuery.isError.value || scenarioQuery.isError.value,
  (isError) => {
    if (!isError) return
    const error = exerciseQuery.error.value || scenarioQuery.error.value
    toast.error(error instanceof Error ? error.message : 'Could not load scenario.')
    goBack()
  },
)

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
  const meta = scenarioMetadataSchema.safeParse({
    name: form.name,
    description: form.description,
  })
  if (!meta.success) {
    toast.warning(meta.error.issues[0]?.message ?? 'Enter a scenario name.')
    return
  }
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
    await commitScenario.mutateAsync({
      exerciseId: props.exerciseId,
      scenarioId: props.scenarioId,
      body: {
        name: meta.data.name || scenario.value.scenarioCode,
        description: meta.data.description.trim() || null,
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
      },
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
  try {
    await deleteScenario.mutateAsync({
      exerciseId: props.exerciseId,
      scenarioId: props.scenarioId,
    })
    toast.success('Scenario deleted.')
    void router.push({ name: 'supervisor-exercise-detail', params: { id: props.exerciseId } })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Delete failed.')
  } finally {
    deleteOpen.value = false
  }
}

function goBack() {
  void router.push({
    name: snapshotMode.value ? 'supervisor-exercise-snapshot' : 'supervisor-exercise-detail',
    params: { id: props.exerciseId },
  })
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
      <ScenarioAssumptionsSection
        :exercise-id="exerciseId"
        :read-only="readOnly"
        :busy="busy"
        :right-sizing-hc="form.rightSizingHc"
        :shift-rows="shiftRows"
        :sizing-completed="sizingCompleted"
        :slot-completed="slotCompleted"
        :slot-locked="slotLocked"
        :latest-monthly-sizing="latestMonthlySizing"
        :latest-daily-sizing="latestDailySizing"
        :latest-slot-simulation="latestSlotSimulation"
        :team-setup="teamSetup"
        :shift-setup-label="shiftSetupLabel"
        @update:right-sizing-hc="form.rightSizingHc = $event"
        @run-sizing="runSizing"
        @run-slot="runSlot"
        @add-shift="addShift"
        @remove-shift="removeShift"
        @shift-edited="onShiftEdited"
      />

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
