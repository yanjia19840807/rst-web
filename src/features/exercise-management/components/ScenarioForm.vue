<script setup lang="ts">
import { Info } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import { infoHintButtonClass, infoHintIconClass } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatMonth } from '@/lib/datetime'
import { measuredRightSizingHc } from '@/lib/hcFormat'

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
import { FieldUnit, withUnit } from '../fieldUnits'
import { sumSupportFte } from './associated-data/supportOptions'
import {
  emptyScenarioForm,
  emptyShiftDraft,
  scenarioFormSchema,
  scenarioSlotSchema,
  toShiftRequests,
  type ScenarioFormValues,
} from '../schemas/scenario'
import { actualHeadcount } from '../sizingChartMath'
import type {
  ForecastBundle,
  MonthlySizingView,
  DailySizingView,
  Scenario,
  SlotSimulationView,
} from '../types'
import { formatNumber } from './associated-data/adTypes'
import ScenarioAssumptionsSection from './ScenarioAssumptionsSection.vue'
import ScenarioResultsPanel from './ScenarioResultsPanel.vue'
import type { ScenarioResultRow } from './ScenarioResultsPanel.vue'
import ToolkitInfoDialog from './ToolkitInfoDialog.vue'

const props = defineProps<{
  exerciseId: string
  scenarioId: string
}>()

const route = useRoute()
const router = useRouter()
const { commitScenario, deleteScenario, previewSizing, runSlotSimulation } = useScenarioMutations()
const snapshotMode = computed(() => route.name === 'supervisor-scenario-snapshot')
const saving = computed(() => commitScenario.isPending.value)
const runningSizing = computed(() => previewSizing.isPending.value)
const runningSlot = computed(() => runSlotSimulation.isPending.value)
const busy = computed(() => saving.value || runningSizing.value || runningSlot.value)
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

const {
  defineField,
  errors,
  handleSubmit,
  resetForm,
  setFieldError,
  validate,
  values,
} = useForm<ScenarioFormValues>({
  validationSchema: toTypedSchema(scenarioFormSchema),
  initialValues: emptyScenarioForm(),
  validateOnMount: false,
})

const [name] = defineField('name')
const [description] = defineField('description')
const [rightSizingHc] = defineField('rightSizingHc')
const [shiftRows] = defineField('shifts')

const readOnly = computed(() => !exercise.value?.canEdit)

const periodHint = computed(() => {
  if (!exercise.value) return ''
  return formatMonth(exercise.value.sizingMonth)
})

const supportFte = computed(() => sumSupportFte(support.value))

const deliveryHc = computed(() =>
  (exercise.value?.snapshot.sharedKpis ?? []).reduce(
    (sum, item) => sum + Number(item.deliveryHc),
    0,
  ),
)

const actualSize = computed(() =>
  actualHeadcount(teamSetup.value?.totalAgents, deliveryHc.value),
)

const shiftSetupLabel = computed(() => {
  const n = shiftRows.value?.length ?? 0
  return n > 0 ? String(n) : '—'
})

function fieldError(path: string) {
  const bag = errors.value as Record<string, string | undefined>
  return bag[path] ?? bag[path.replace(/\.(\d+)\./g, '[$1].')]
}

function firstFormError(bag: Record<string, unknown>): string | undefined {
  for (const value of Object.values(bag)) {
    if (typeof value === 'string' && value.trim()) return value
    if (Array.isArray(value)) {
      const nested = firstFormError(Object.assign({}, value))
      if (nested) return nested
    } else if (value && typeof value === 'object') {
      const nested = firstFormError(value as Record<string, unknown>)
      if (nested) return nested
    }
  }
}

const shiftFieldErrors = computed(() =>
  (shiftRows.value ?? []).map((_, index) => ({
    startTime: fieldError(`shifts.${index}.startTime`),
    durationHours: fieldError(`shifts.${index}.durationHours`),
    headcount: fieldError(`shifts.${index}.headcount`),
  })),
)

const medianLabel = computed(() =>
  cycleTime.value ? Number(cycleTime.value.medianSeconds).toFixed(2) : '—',
)

const medianSourceLabel = computed(() => {
  if (!cycleTime.value) return '—'
  return cycleTime.value.baselineType?.toUpperCase() === 'MANUAL'
    ? 'Manual median input'
    : 'System-calculated median'
})

function formatRatioPercent(ratio: number | null | undefined) {
  if (ratio == null || Number.isNaN(Number(ratio))) return '—'
  return formatNumber(Number(ratio) * 100, 2)
}

function slaTypeLabel(value: string | null | undefined) {
  if (value === 'BUSINESS_HOURS') return 'Working Hours'
  if (value === 'CALENDAR_HOURS') return 'Calendar Hours'
  return value || '—'
}

/** Exercise AD / snapshot inputs used by simulation (read-only on this page). */
const baselineInputRows = computed(() => {
  const setup = teamSetup.value
  return [
    {
      label:
        Number(setup?.totalAgents) > 0
          ? withUnit('Team Setup Total Agents', FieldUnit.hc)
          : 'Delivery HC',
      value: formatNumber(actualSize.value, 2),
    },
    { label: withUnit('Median Cycle Time', FieldUnit.seconds), value: medianLabel.value },
    { label: 'Median source', value: medianSourceLabel.value },
    {
      label: withUnit('Production support', FieldUnit.fte),
      value: supportFte.value != null ? formatNumber(supportFte.value, 2) : '—',
    },
    { label: 'SLA type', value: slaTypeLabel(setup?.slaType) },
    {
      label: withUnit('SLA Turntime', FieldUnit.minutes),
      value: formatNumber(setup?.slaTurnaroundMinutes, 2),
    },
    { label: withUnit('SLA Target', FieldUnit.percent), value: formatRatioPercent(setup?.slaTargetRatio) },
    {
      label: withUnit('Working hours / day', FieldUnit.hours),
      value: formatNumber(setup?.workingHoursPerDay, 2),
    },
    {
      label: withUnit('Availability ratio', FieldUnit.percent),
      value: formatRatioPercent(setup?.availabilityRatio),
    },
    {
      label: withUnit('Capacity ratio', FieldUnit.percent),
      value: formatRatioPercent(setup?.capacityRatio),
    },
    {
      label: withUnit('Automation ratio', FieldUnit.percent),
      value: formatRatioPercent(setup?.automationRatio),
    },
    {
      label: withUnit('Working days / year', FieldUnit.days),
      value: formatNumber(setup?.workingDaysPerYear, 2),
    },
    {
      label: withUnit('Daily capacity / agent', FieldUnit.transactions),
      value: formatNumber(setup?.dailyCapacityPerAgent, 0),
    },
    {
      label: withUnit('Max daily overtime', FieldUnit.minutes),
      value: formatNumber(setup?.maxOvertimeMinutes, 2),
    },
    {
      label: withUnit('Weekend shift', FieldUnit.fte),
      value: formatNumber(setup?.weekendShiftHc, 2),
    },
  ]
})

/**
 * Outcome metrics only: simulation outputs and values derived from them
 * (inputs live in Scenario Info).
 */
const resultRows = computed<ScenarioResultRow[]>(() => {
  const rsHc = measuredRightSizingHc(rightSizingHc.value)
  const supportVal = supportFte.value
  const capacity =
    rsHc != null && supportVal != null ? actualSize.value - rsHc - supportVal : null
  const capacityLabel =
    capacity == null ? '—' : `${capacity >= 0 ? '+' : ''}${capacity.toFixed(2)}`

  const firstSizing = latestMonthlySizing.value?.rows[0]
  const firstRs = measuredRightSizingHc(firstSizing?.rightSizingHc)
  const rows: ScenarioResultRow[] = [
    { label: withUnit('Actual size', FieldUnit.hc), value: actualSize.value.toFixed(2) },
    {
      label: withUnit('Right size', FieldUnit.hc),
      value: firstRs != null ? firstRs.toFixed(2) : rsHc != null ? rsHc.toFixed(2) : '—',
    },
    {
      label: withUnit('Capacity Creation', FieldUnit.hc),
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
    { label: withUnit('Shift Setup', FieldUnit.shifts), value: shiftSetupLabel.value },
  ]

  if (firstSizing) {
    rows.splice(1, 0, {
      label: 'Nominal HC (w/o OT)',
      value: String(Number(firstSizing.nominalHcWithoutOt).toFixed(2)),
    })
  }
  if (latestDailySizing.value?.rows?.length) {
    const endBacklog =
      latestDailySizing.value.rows[latestDailySizing.value.rows.length - 1]?.backlogEnd
    rows.push({
      label: withUnit('Daily sim days', FieldUnit.days),
      value: String(latestDailySizing.value.rows.length),
    })
    if (endBacklog != null) {
      rows.push({ label: 'End backlog', value: Number(endBacklog).toFixed(2) })
    }
  }

  if (slotCompleted.value && latestSlotSimulation.value) {
    const tatPct = Number(latestSlotSimulation.value.tatOnPeriod) * 100
    const actualVsPct = Number(latestSlotSimulation.value.actualVsTheoretical) * 100
    const target = latestSlotSimulation.value.slaTargetRatio
    const tatBad = target != null && Number(latestSlotSimulation.value.tatOnPeriod) < Number(target)
    rows.push(
      {
        label: withUnit('TAT on period', FieldUnit.percent),
        value: tatPct.toFixed(2),
        emphasize: tatBad ? 'bad' : 'good',
      },
      {
        label: withUnit('Actual vs theoretical', FieldUnit.percent),
        value: actualVsPct.toFixed(0),
      },
    )
  }

  return rows
})

const slotLocked = computed(() => !sizingCompleted.value)

const slotLockReason = computed(() => {
  if (!sizingCompleted.value) {
    return 'Run Sizing Simulation first to unlock Slot Simulation.'
  }
  return null
})

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
  const savedShifts = value.shifts ?? []
  resetForm({
    values: {
      name: value.name,
      description: value.description ?? '',
      rightSizingHc: value.rightSizingHc != null ? Number(value.rightSizingHc) : 0,
      shifts: savedShifts.length
        ? savedShifts.map((shift) => ({
            shiftNo: shift.shiftNo,
            startTime: shift.startTime.length === 5 ? `${shift.startTime}:00` : shift.startTime,
            durationHours:
              shift.durationMinutes == null ? null : Number(shift.durationMinutes) / 60,
            headcount: Number(shift.headcount),
            worksOnWeekend: shift.worksOnWeekend,
          }))
        : [emptyShiftDraft()],
    },
  })
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

function addShift() {
  if (slotLocked.value || readOnly.value) return
  const rows = [...(shiftRows.value ?? [])]
  rows.push(emptyShiftDraft(rows.length + 1))
  shiftRows.value = rows
}

function removeShift() {
  const rows = shiftRows.value ?? []
  if (slotLocked.value || readOnly.value || rows.length <= 1) return
  const next = rows.slice(0, -1).map((row, index) => ({ ...row, shiftNo: index + 1 }))
  shiftRows.value = next
}

function applyZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  for (const issue of issues) {
    setFieldError(issue.path.join('.'), issue.message)
  }
}

const save = handleSubmit(
  async (formValues) => {
    if (!scenario.value || readOnly.value || busy.value) return
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
          name: formValues.name || scenario.value.scenarioCode,
          description: formValues.description.trim() || null,
          rightSizingHc: Number(formValues.rightSizingHc),
          shifts: toShiftRequests(formValues.shifts),
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
    }
  },
  ({ errors: submitErrors }) => {
    toast.warning(firstFormError(submitErrors) ?? 'Check the highlighted fields.')
  },
)

async function runSizing() {
  if (readOnly.value || busy.value) return
  const result = await validate()
  const hc = Number(values.rightSizingHc)
  if (!Number.isFinite(hc) || hc <= 0) {
    setFieldError('rightSizingHc', 'Right Sizing HC must be a positive number.')
    toast.warning('Right Sizing HC must be a positive number.')
    return
  }
  if (!result.valid) {
    toast.warning(firstFormError(errors.value) ?? 'Check the highlighted fields.')
    return
  }
  try {
    const preview = await previewSizing.mutateAsync({
      exerciseId: props.exerciseId,
      scenarioId: props.scenarioId,
      rightSizingHc: hc,
    })
    latestForecastBundle.value = preview.forecast
    latestMonthlySizing.value = preview.monthly
    latestDailySizing.value = preview.daily
    sizingCompleted.value = true
    const method = preview.forecast.monthly?.method ?? 'forecast'
    toast.success(
      `Sizing preview ready (${method}, ${preview.monthly.rows.length} months, ${preview.daily.rows.length} days). Save to keep.`,
    )
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Sizing simulation failed.')
  }
}

async function runSlot() {
  if (readOnly.value || busy.value || slotLocked.value) {
    if (slotLockReason.value) toast.warning(slotLockReason.value)
    return
  }
  const slot = scenarioSlotSchema.safeParse(values)
  if (!slot.success) {
    applyZodIssues(slot.error.issues)
    toast.warning('Check the highlighted fields.')
    return
  }
  try {
    latestSlotSimulation.value = await runSlotSimulation.mutateAsync({
      exerciseId: props.exerciseId,
      scenarioId: props.scenarioId,
      shifts: toShiftRequests(slot.data.shifts),
    })
    slotCompleted.value = true
    const tatPct = (Number(latestSlotSimulation.value.tatOnPeriod) * 100).toFixed(2)
    toast.success(
      `Slot preview ready (${latestSlotSimulation.value.rows.length} slots, TAT ${tatPct}%). Save to keep.`,
    )
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Slot simulation failed.')
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
    {
      label: 'Official',
      value: exercise.value?.officialScenarioId === scenario.value?.id ? 'Yes' : 'No',
    },
  ]
  if (readOnly.value) {
    rows.push(
      { label: 'Name', value: name.value },
      { label: 'Description', value: description.value },
    )
  }
  return rows
})
</script>

<template>
  <ListLoading v-if="loading" class="h-48" />
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
      <Button v-if="!readOnly" variant="destructive" :disabled="busy" @click="deleteOpen = true">
        Delete Scenario
      </Button>
      <Button v-if="!readOnly" :disabled="busy" :loading="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save Scenario' }}
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
                :class="infoHintButtonClass"
                title="Toolkit info"
                @click="toolkitInfoOpen = true"
              >
                <Info :class="infoHintIconClass" />
                <span class="sr-only">Toolkit info</span>
              </button>
            </span>
          </template>
        </DetailTable>

        <div v-if="!readOnly" class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm sm:col-span-2">
            Name
            <Input v-model="name" :aria-invalid="Boolean(errors.name)" />
            <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
          </label>
          <label class="grid gap-1 text-sm sm:col-span-2">
            Description
            <Textarea v-model="description" rows="2" />
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
          Sizing Month, TMS period, and Associated Data are maintained on the Exercise
          ({{ periodHint }}). Slot Period is set in Volume Input. This scenario only changes
          Right Sizing HC, shifts, and simulation.
        </div>
      </CardContent>
    </Card>

    <ToolkitInfoDialog
      v-model:open="toolkitInfoOpen"
      :snapshot="exercise.snapshot"
      :alignment="exercise.timesheetAlignment"
    />

    <div class="grid items-start gap-3.5 lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)]">
      <ScenarioAssumptionsSection
        :exercise-id="exerciseId"
        :sizing-month="exercise.sizingMonth"
        :read-only="readOnly"
        :busy="busy"
        :running-sizing="runningSizing"
        :running-slot="runningSlot"
        :right-sizing-hc="Number(rightSizingHc ?? 0)"
        :right-sizing-hc-error="errors.rightSizingHc"
        :shift-rows="shiftRows ?? []"
        :shifts-error="typeof errors.shifts === 'string' ? errors.shifts : undefined"
        :shift-field-errors="shiftFieldErrors"
        :sizing-completed="sizingCompleted"
        :slot-completed="slotCompleted"
        :slot-locked="slotLocked"
        :slot-lock-reason="slotLockReason"
        :latest-monthly-sizing="latestMonthlySizing"
        :latest-daily-sizing="latestDailySizing"
        :latest-slot-simulation="latestSlotSimulation"
        :team-setup="teamSetup"
        :shift-setup-label="shiftSetupLabel"
        @update:right-sizing-hc="rightSizingHc = $event"
        @run-sizing="runSizing"
        @run-slot="runSlot"
        @add-shift="addShift"
        @remove-shift="removeShift"
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
      description="This scenario will be removed from the exercise. This cannot be undone."
      confirm-label="Delete Scenario"
      :pending="deletePending"
      @confirm="confirmDelete"
    />
  </div>
</template>
