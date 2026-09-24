<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import TableTextLink from '@/components/TableTextLink.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { capacityEmphasize, measuredRightSizingHc } from '@/lib/hcFormat'

import { useScenarioMutations } from '../api/mutations'
import {
  useCalendarQuery,
  useCycleTimeActiveQuery,
  useDailyVolumesQuery,
  useExerciseQuery,
  useLatestDailySimulationQuery,
  useLatestForecastQuery,
  useLatestMonthlySizingQuery,
  useLatestSlotSimulationQuery,
  useMonthlyVolumesQuery,
  useScenarioQuery,
  useSlotVolumesQuery,
  useSupportQuery,
  useTeamSetupQuery,
} from '../api/queries'
import { FieldUnit, withUnit } from '../fieldUnits'
import { deriveSlotPeriodLabel } from '../periodWindows'
import { countHolidayTypes, DEFAULT_WEEKEND_CODE, normalizeWeekendCode, weekendCodeLabel } from '../weekendCodes'
import { slaMinutesToHours } from '../schemas/teamSetup'
import { sumSupportFte } from './associated-data/supportOptions'
import {
  emptyScenarioForm,
  emptyShiftDraft,
  MAX_SCENARIO_SHIFTS,
  scenarioFormSchema,
  scenarioSlotSchema,
  toShiftRequests,
  type ScenarioFormValues,
  type ShiftDraft,
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
const calendarQuery = useCalendarQuery(() => props.exerciseId)
const monthlyVolumesQuery = useMonthlyVolumesQuery(() => props.exerciseId)
const dailyVolumesQuery = useDailyVolumesQuery(() => props.exerciseId)
const slotVolumesQuery = useSlotVolumesQuery(() => props.exerciseId)
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
const calendar = computed(() => calendarQuery.data.value ?? null)
const monthlyVolumes = computed(() => monthlyVolumesQuery.data.value ?? [])
const dailyVolumes = computed(() => dailyVolumesQuery.data.value ?? [])
const slotVolumes = computed(() => slotVolumesQuery.data.value ?? [])
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
const [shiftRows] = defineField('shifts', { validateOnModelUpdate: false })

const readOnly = computed(() => !exercise.value?.canEdit)

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
    weekendCode: fieldError(`shifts.${index}.weekendCode`),
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

function monthKey(value: string | null | undefined) {
  return (value ?? '').slice(0, 7)
}

function coverageLabel(
  count: number,
  first: string | undefined,
  last: string | undefined,
  unit: string,
) {
  if (!count || !first || !last) return '—'
  const period = first === last ? first : `${first} – ${last}`
  return `${period} · ${count} ${unit}`
}

/** Exercise AD / snapshot inputs used by simulation (read-only on this page). */
const baselineInputGroups = computed(() => {
  const setup = teamSetup.value
  const holidays = countHolidayTypes(calendar.value?.holidays ?? [])
  const months = [...monthlyVolumes.value].sort((a, b) => a.month.localeCompare(b.month))
  const days = [...dailyVolumes.value].sort((a, b) => a.volumeDate.localeCompare(b.volumeDate))
  const sizingMonth = monthKey(exercise.value?.sizingMonth)
  const sizingMonthRow = months.find((row) => monthKey(row.month) === sizingMonth)
  const slotPeriod =
    exercise.value?.slotStartDate && exercise.value.slotWeeks
      ? deriveSlotPeriodLabel(exercise.value.slotStartDate, exercise.value.slotWeeks)
      : null
  const slotCount = slotVolumes.value.length
  return [
    {
      title: 'Capacity',
      rows: [
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
        { label: 'Weekend code', value: weekendCodeLabel(setup?.weekendCode) },
        {
          label: withUnit('Skeleton coverage', FieldUnit.percent),
          value: formatRatioPercent(setup?.skeletonRatio),
        },
      ],
    },
    {
      title: 'SLA',
      rows: [
        { label: 'SLA type', value: slaTypeLabel(setup?.slaType) },
        {
          label: withUnit('SLA Turntime', FieldUnit.hours),
          value: formatNumber(slaMinutesToHours(setup?.slaTurnaroundMinutes), 2),
        },
        {
          label: withUnit('SLA Target', FieldUnit.percent),
          value: formatRatioPercent(setup?.slaTargetRatio),
        },
      ],
    },
    {
      title: 'Calendar',
      rows: [
        { label: 'Holiday / Weekend days', value: String(holidays.rest) },
        { label: 'Makeup (Normal) days', value: String(holidays.makeup) },
        { label: 'Listed dates', value: String(holidays.total) },
      ],
    },
    {
      title: 'Volume',
      rows: [
        {
          label: withUnit('Sizing month actual', FieldUnit.transactions),
          value:
            sizingMonthRow?.actualVolume != null
              ? formatNumber(sizingMonthRow.actualVolume, 2)
              : '—',
        },
        {
          label: 'Monthly volume',
          value: coverageLabel(
            months.length,
            months[0]?.month,
            months[months.length - 1]?.month,
            months.length === 1 ? 'month' : 'months',
          ),
        },
        {
          label: 'Daily volume',
          value: coverageLabel(
            days.length,
            days[0]?.volumeDate,
            days[days.length - 1]?.volumeDate,
            days.length === 1 ? 'day' : 'days',
          ),
        },
        {
          label: 'Slot volume',
          value: slotPeriod
            ? `${slotPeriod} · ${slotCount} ${slotCount === 1 ? 'slot' : 'slots'}`
            : slotCount
              ? `${slotCount} ${slotCount === 1 ? 'slot' : 'slots'}`
              : 'Not set',
        },
      ],
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
        ? capacityEmphasize(firstSizing.capacityCreation)
        : capacityEmphasize(capacity),
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
            weekendCode: normalizeWeekendCode(shift.weekendCode) || DEFAULT_WEEKEND_CODE,
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
  if (rows.length >= MAX_SCENARIO_SHIFTS) return
  rows.push(emptyShiftDraft(rows.length + 1))
  shiftRows.value = rows
}

function removeShift() {
  const rows = shiftRows.value ?? []
  if (slotLocked.value || readOnly.value || rows.length <= 1) return
  const next = rows.slice(0, -1).map((row, index) => ({ ...row, shiftNo: index + 1 }))
  shiftRows.value = next
  clearShiftFieldErrors()
}

function updateShift({ index, patch }: { index: number; patch: Partial<ShiftDraft> }) {
  const rows = [...(shiftRows.value ?? [])]
  const current = rows[index]
  if (!current) return
  rows[index] = { ...current, ...patch }
  shiftRows.value = rows
  for (const field of Object.keys(patch) as (keyof ShiftDraft)[]) {
    setFieldError(`shifts.${index}.${field}`, undefined)
  }
}

function clearShiftFieldErrors() {
  const count = Math.max(values.shifts?.length ?? 0, MAX_SCENARIO_SHIFTS)
  for (let index = 0; index < count; index++) {
    setFieldError(`shifts.${index}.startTime`, undefined)
    setFieldError(`shifts.${index}.durationHours`, undefined)
    setFieldError(`shifts.${index}.headcount`, undefined)
    setFieldError(`shifts.${index}.weekendCode`, undefined)
  }
}

function applyZodIssues(issues: { path: PropertyKey[]; message: string }[]) {
  clearShiftFieldErrors()
  for (const issue of issues) {
    setFieldError(issue.path.join('.'), issue.message)
  }
}

async function persistScenario(
  formValues: ScenarioFormValues,
  results: {
    forecast: ForecastBundle
    monthly: MonthlySizingView
    daily: DailySizingView
    slot: SlotSimulationView | null
  } | null,
  successMessage: string,
) {
  if (!scenario.value || readOnly.value) return
  await commitScenario.mutateAsync({
    exerciseId: props.exerciseId,
    scenarioId: props.scenarioId,
    body: {
      name: formValues.name || scenario.value.scenarioCode,
      description: formValues.description.trim() || null,
      rightSizingHc: Number(formValues.rightSizingHc),
      shifts: toShiftRequests(formValues.shifts),
      results,
    },
  })
  toast.success(successMessage)
}

function currentSizingResults(slot: SlotSimulationView | null) {
  if (
    !latestForecastBundle.value ||
    !latestMonthlySizing.value ||
    !latestDailySizing.value
  ) {
    return null
  }
  return {
    forecast: latestForecastBundle.value,
    monthly: latestMonthlySizing.value,
    daily: latestDailySizing.value,
    slot,
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
      await persistScenario(
        formValues,
        hasSizingResults
          ? currentSizingResults(slotCompleted.value ? latestSlotSimulation.value : null)
          : null,
        'Scenario saved.',
      )
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
    try {
      await persistScenario(
        values,
        {
          forecast: preview.forecast,
          monthly: preview.monthly,
          daily: preview.daily,
          slot: slotCompleted.value ? latestSlotSimulation.value : null,
        },
        `Sizing simulation saved (${method}, ${preview.monthly.rows.length} months, ${preview.daily.rows.length} days).`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed.')
    }
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
  clearShiftFieldErrors()
  try {
    const slotView = await runSlotSimulation.mutateAsync({
      exerciseId: props.exerciseId,
      scenarioId: props.scenarioId,
      shifts: toShiftRequests(slot.data.shifts),
    })
    latestSlotSimulation.value = slotView
    slotCompleted.value = true
    const results = currentSizingResults(slotView)
    if (!results) {
      toast.success(
        `Slot preview ready (${slotView.rows.length} slots). Run Sizing Simulation first to save.`,
      )
      return
    }
    const tatPct = (Number(slotView.tatOnPeriod) * 100).toFixed(2)
    try {
      await persistScenario(
        {
          name: slot.data.name,
          description: slot.data.description,
          rightSizingHc: slot.data.rightSizingHc,
          shifts: slot.data.shifts,
        },
        results,
        `Slot simulation saved (${slotView.rows.length} slots, TAT ${tatPct}%).`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed.')
    }
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

const exerciseBackTo = computed(() => ({
  name: snapshotMode.value ? 'supervisor-exercise-snapshot' : 'supervisor-exercise-detail',
  params: { id: props.exerciseId },
}))

function goBack() {
  void router.push(exerciseBackTo.value)
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
  <div v-else-if="exercise && scenario" class="grid min-w-0 gap-4">
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
            <TableTextLink
              v-if="row.value"
              title="Toolkit info"
              @click="toolkitInfoOpen = true"
            >
              {{ row.value }}
            </TableTextLink>
            <span v-else>—</span>
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
          <div class="mb-3 flex items-center justify-between gap-2">
            <h3 class="text-sm font-bold">Baseline inputs (from Exercise)</h3>
            <Button
              :as="RouterLink"
              :to="exerciseBackTo"
              variant="link"
              class="h-auto px-0 font-semibold"
            >
              {{ snapshotMode ? 'View' : 'Edit' }} on Exercise
            </Button>
          </div>
          <div class="space-y-4">
            <section v-for="group in baselineInputGroups" :key="group.title">
              <h4 class="mb-1 text-xs font-medium text-muted-foreground">{{ group.title }}</h4>
              <DetailTable :rows="group.rows" :columns="2" />
            </section>
          </div>
        </div>
      </CardContent>
    </Card>

    <ToolkitInfoDialog
      v-model:open="toolkitInfoOpen"
      show-delivery-hc
      :snapshot="exercise.snapshot"
      :alignment="exercise.timesheetAlignment"
    />

    <div class="grid min-w-0 items-start gap-3.5 lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)]">
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
        @update:shift="updateShift"
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
