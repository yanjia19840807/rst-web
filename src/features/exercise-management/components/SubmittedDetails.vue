<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import DetailTable from '@/components/DetailTable.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import { Badge } from '@/components/ui/badge'
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
import TimesheetAlignmentAlert from '@/features/timesheet-alignment/components/TimesheetAlignmentAlert.vue'
import { formatDate, formatDateTime, formatMonth } from '@/lib/datetime'
import { measuredRightSizingHc } from '@/lib/hcFormat'
import { useApprovalMutations } from '@/features/approval/api/mutations'
import { useApprovalDetailQuery } from '@/features/approval/api/queries'
import ApprovalCompletedPanel from '@/features/approval/components/ApprovalCompletedPanel.vue'
import ApprovalInProgressPanel from '@/features/approval/components/ApprovalInProgressPanel.vue'
import { historyFromActions } from '@/features/approval/historyFromActions'
import type { ApprovalDetailView } from '@/features/approval/types'

import {
  useCycleTimeActiveQuery,
  useExerciseQuery,
  useForecastTrainingQuery,
  useLatestDailySimulationQuery,
  useLatestMonthlySizingQuery,
  useLatestSlotSimulationQuery,
  useScenarioQuery,
  useSubmittedDetailsQuery,
  useSupportQuery,
  useTeamSetupQuery,
} from '../api/queries'
import { FieldUnit, withUnit } from '../fieldUnits'
import { deriveSizingWindows, deriveSlotPeriodLabel } from '../periodWindows'
import { actualHeadcount } from '../sizingChartMath'
import type { ForecastTrainingObservation, SubmittedDetails } from '../types'
import { formatNumber } from './associated-data/adTypes'
import { sumSupportFte } from './associated-data/supportOptions'
import AssociatedDataPanel from './AssociatedDataPanel.vue'
import SizingSimulationCharts from './SizingSimulationCharts.vue'
import SlotSimulationCharts from './SlotSimulationCharts.vue'
import ToolkitInfoDialog from './ToolkitInfoDialog.vue'

const props = withDefaults(
  defineProps<{
    exerciseId?: string
    submissionId?: string
    mode?: 'supervisor' | 'approver'
  }>(),
  { mode: 'supervisor' },
)

const isApprover = computed(() => props.mode === 'approver')

const router = useRouter()
const pageTab = ref<'exercise' | 'approval'>('exercise')
const simulationTab = ref<'sizing' | 'slot'>('sizing')
const toolkitInfoOpen = ref(false)
const comments = ref('')
const redirected = ref(false)

const { approve, returnToSupervisor, reject } = useApprovalMutations()
const approvalQuery = useApprovalDetailQuery(
  () => props.submissionId,
  isApprover,
)
const submittedQuery = useSubmittedDetailsQuery(
  () => props.exerciseId,
  () => !isApprover.value,
)

function toSubmittedDetails(detail: ApprovalDetailView): SubmittedDetails {
  return {
    exerciseId: detail.exerciseId,
    exerciseCode: detail.exerciseCode,
    workflowStatus: detail.workflowStatus,
    submittedAt: detail.submittedAt,
    scenarioId: detail.scenarioId,
    scenarioName: detail.scenarioName,
    submissionId: detail.submissionId,
    submissionStatus: detail.submissionStatus,
    currentStep: detail.currentStep,
    requiredRole: detail.requiredRole,
    remarks: detail.remarks,
    scopes: detail.scopes,
    steps: detail.steps,
    actions: detail.actions,
    canDecide: detail.canDecide,
    workspace: detail.workspace,
  }
}

const details = computed(() => {
  if (isApprover.value) {
    const approval = approvalQuery.data.value
    return approval ? toSubmittedDetails(approval) : null
  }
  return submittedQuery.data.value ?? null
})

const resolvedExerciseId = computed(
  () => details.value?.exerciseId || props.exerciseId || '',
)
const exerciseQuery = useExerciseQuery(resolvedExerciseId)
const exercise = computed(() => exerciseQuery.data.value ?? null)
const scenarioId = computed(
  () => details.value?.scenarioId || exercise.value?.officialScenarioId || undefined,
)
const scenarioQuery = useScenarioQuery(resolvedExerciseId, scenarioId, { optional: true })
const teamSetupQuery = useTeamSetupQuery(resolvedExerciseId)
const supportQuery = useSupportQuery(resolvedExerciseId)
const cycleTimeQuery = useCycleTimeActiveQuery(resolvedExerciseId)
const monthlyQuery = useLatestMonthlySizingQuery(resolvedExerciseId, scenarioId)
const dailyQuery = useLatestDailySimulationQuery(resolvedExerciseId, scenarioId)
const slotQuery = useLatestSlotSimulationQuery(resolvedExerciseId, scenarioId)

const scenario = computed(() => scenarioQuery.data.value ?? null)
const teamSetup = computed(() => teamSetupQuery.data.value ?? null)
const support = computed(() => supportQuery.data.value ?? [])
const cycleTime = computed(() => cycleTimeQuery.data.value ?? null)
const latestMonthlySizing = computed(() => monthlyQuery.data.value ?? null)
const latestDailySizing = computed(() => dailyQuery.data.value ?? null)
const latestSlotSimulation = computed(() => slotQuery.data.value ?? null)
const trainingQuery = useForecastTrainingQuery(resolvedExerciseId, scenarioId)
const trainingBundle = computed(() => trainingQuery.data.value ?? null)
const hasTrainingObservations = computed(
  () =>
    (trainingBundle.value?.monthly.length ?? 0) > 0 ||
    (trainingBundle.value?.daily.length ?? 0) > 0,
)

function trainingPeriodLabel(row: ForecastTrainingObservation) {
  if (row.grain === 'MONTH') return formatMonth(row.periodStart)
  return formatDate(row.periodStart)
}
const pending = computed(
  () =>
    approve.isPending.value || returnToSupervisor.isPending.value || reject.isPending.value,
)

const primaryPending = computed(() =>
  isApprover.value
    ? approvalQuery.isPending.value && !approvalQuery.data.value
    : submittedQuery.isPending.value && !submittedQuery.data.value,
)
const loading = computed(
  () =>
    primaryPending.value ||
    (Boolean(resolvedExerciseId.value) &&
      exerciseQuery.isPending.value &&
      !exerciseQuery.data.value),
)

function redirectAway(message: string) {
  if (redirected.value) return
  redirected.value = true
  toast.error(message)
  void router.push({
    name: isApprover.value ? 'approver-queue' : 'supervisor-exercise-detail',
    params: isApprover.value ? undefined : { id: props.exerciseId },
  })
}

watch(
  () =>
    isApprover.value
      ? approvalQuery.isError.value
      : submittedQuery.isError.value ||
        (Boolean(props.exerciseId) && exerciseQuery.isError.value),
  (isError) => {
    if (!isError) return
    const error = isApprover.value
      ? approvalQuery.error.value
      : submittedQuery.error.value || exerciseQuery.error.value
    redirectAway(error instanceof Error ? error.message : 'Could not load submitted details.')
  },
)

const workspace = computed(() => {
  const raw = details.value?.workspace
  if (!raw) return null
  if (raw.history?.length) return raw
  return {
    ...raw,
    history: historyFromActions(details.value?.actions ?? []),
  }
})
const inProgress = computed(() => workspace.value?.mode === 'IN_PROGRESS')

const sizingWindows = computed(() =>
  exercise.value ? deriveSizingWindows(exercise.value.sizingMonth) : null,
)

const deliveryHc = computed(() =>
  (exercise.value?.snapshot.sharedKpis ?? []).reduce(
    (sum, item) => sum + Number(item.deliveryHc),
    0,
  ),
)

const actualSize = computed(() =>
  actualHeadcount(teamSetup.value?.totalAgents, deliveryHc.value),
)

const supportFte = computed(() => sumSupportFte(support.value))

const rightSizingHc = computed(() => {
  const fromSizing = measuredRightSizingHc(latestMonthlySizing.value?.rows[0]?.rightSizingHc)
  if (fromSizing != null) return fromSizing
  return measuredRightSizingHc(scenario.value?.rightSizingHc)
})

const capacityCreation = computed(() => {
  const fromSizing = latestMonthlySizing.value?.rows[0]?.capacityCreation
  if (fromSizing != null) return Number(fromSizing)
  const rs = rightSizingHc.value
  if (rs == null || supportFte.value == null) return null
  return actualSize.value - rs - supportFte.value
})

const shiftSetupLabel = computed(() => {
  const fromSlot = latestSlotSimulation.value?.shiftCount
  const n = fromSlot ?? scenario.value?.shifts?.length ?? 0
  if (n <= 0) return '—'
  return String(n)
})

const medianLabel = computed(() =>
  cycleTime.value ? Number(cycleTime.value.medianSeconds).toFixed(2) : '—',
)

const medianSourceLabel = computed(() => {
  if (!cycleTime.value) return '—'
  return cycleTime.value.baselineType?.toUpperCase() === 'MANUAL'
    ? 'Manual'
    : 'System-calculated'
})

const slaTargetLabel = computed(() => {
  const ratio = teamSetup.value?.slaTargetRatio
  if (ratio == null) return '—'
  return String(Math.round(Number(ratio) * 100))
})

const slaTurntimeLabel = computed(() => {
  const minutes = teamSetup.value?.slaTurnaroundMinutes
  if (minutes == null) return '—'
  return Number(minutes).toFixed(2)
})

function formatSigned(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function formatHc(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return Number(value).toFixed(2)
}

const hasSizing = computed(
  () =>
    (latestMonthlySizing.value?.rows?.length ?? 0) > 0 ||
    (latestDailySizing.value?.rows?.length ?? 0) > 0,
)

const hasSlot = computed(
  () =>
    latestSlotSimulation.value != null &&
    ((latestSlotSimulation.value.rows?.length ?? 0) > 0 ||
      (latestSlotSimulation.value.chart?.labels?.length ?? 0) > 0),
)

const packageRows = computed(() => {
  const windows = sizingWindows.value
  const ex = exercise.value
  const submitted = details.value
  if (!ex || !submitted) return []
  return [
    { label: 'Exercise', value: submitted.exerciseCode, strong: true },
    { label: 'Official Scenario', value: submitted.scenarioName ?? submitted.scenarioId },
    { key: 'toolkit', label: 'Toolkit', value: ex.snapshot.toolkit.name },
    { label: 'Sizing Month', value: formatMonth(ex.sizingMonth) },
    { label: 'Month chart history', value: windows?.monthTrain },
    { label: 'Month forecast', value: windows?.monthForecast },
    { label: 'Daily chart history', value: windows?.dailyTrain },
    { label: 'Daily forecast', value: windows?.dailyForecast },
    {
      label: 'Slot Period',
      value: deriveSlotPeriodLabel(ex.slotStartDate, ex.slotWeeks),
    },
    { label: 'TMS period', value: `${formatDate(ex.tmsFrom)} – ${formatDate(ex.tmsTo)}` },
    { label: withUnit('Actual size', FieldUnit.hc), value: actualSize.value.toFixed(2) },
    { label: withUnit('SLA Turntime', FieldUnit.minutes), value: slaTurntimeLabel.value },
    { label: withUnit('SLA Target', FieldUnit.percent), value: slaTargetLabel.value },
    { label: withUnit('Shift Setup', FieldUnit.shifts), value: shiftSetupLabel.value },
    { label: withUnit('Median Cycle Time', FieldUnit.seconds), value: medianLabel.value },
    { key: 'medianSource', label: 'Median source', value: medianSourceLabel.value },
    {
      label: withUnit('Production support', FieldUnit.fte),
      value: supportFte.value != null ? supportFte.value.toFixed(2) : '—',
    },
    { label: withUnit('Right size', FieldUnit.hc), value: formatHc(rightSizingHc.value) },
    { key: 'capacityCreation', label: withUnit('Capacity Creation', FieldUnit.hc), value: formatSigned(capacityCreation.value) },
  ]
})

const kpiAllocationRows = computed(() => {
  const lines = exercise.value?.snapshot.sharedKpis ?? []
  const totalDelivery = deliveryHc.value
  const rs = rightSizingHc.value
  const capacity = capacityCreation.value
  return lines.map((line) => {
    const weight = totalDelivery > 0 ? Number(line.deliveryHc) / totalDelivery : 0
    const lineRs = rs == null ? null : rs * weight
    const lineCapacity = capacity == null ? null : capacity * weight
    return {
      carrier: line.carrier,
      site: line.site,
      customerCountry: line.customerCountry,
      deliveryHc: Number(line.deliveryHc).toFixed(2),
      rightSizingHc: formatHc(lineRs),
      capacityCreation: formatSigned(lineCapacity),
      capacityValue: lineCapacity,
    }
  })
})

const resultRows = computed(() => [
  { label: withUnit('Actual size', FieldUnit.hc), value: actualSize.value.toFixed(2) },
  { label: withUnit('SLA Turntime', FieldUnit.minutes), value: slaTurntimeLabel.value },
  { label: withUnit('SLA Target', FieldUnit.percent), value: slaTargetLabel.value },
  { label: withUnit('Shift Setup', FieldUnit.shifts), value: shiftSetupLabel.value },
  { label: withUnit('Median Cycle Time', FieldUnit.seconds), value: medianLabel.value },
  { label: 'Median source', value: medianSourceLabel.value },
  {
    label: withUnit('Production support', FieldUnit.fte),
    value: supportFte.value != null ? supportFte.value.toFixed(2) : '—',
  },
  { label: withUnit('Right size', FieldUnit.hc), value: formatHc(rightSizingHc.value) },
  { key: 'capacityCreation', label: withUnit('Capacity Creation', FieldUnit.hc), value: formatSigned(capacityCreation.value) },
])

async function onApprove() {
  if (!props.submissionId || pending.value) return
  try {
    await approve.mutateAsync({
      submissionId: props.submissionId,
      body: {
        comments: comments.value.trim() || null,
        requestId: crypto.randomUUID(),
      },
    })
    toast.success('Submission approved.')
    comments.value = ''
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Approve failed.')
  }
}

async function onReturn(reason: string) {
  if (!props.submissionId || pending.value) return
  try {
    await returnToSupervisor.mutateAsync({
      submissionId: props.submissionId,
      body: {
        comments: reason,
        requestId: crypto.randomUUID(),
      },
    })
    comments.value = ''
    toast.success('Returned to supervisor.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Return failed.')
  }
}

function requestReturn() {
  const reason = comments.value.trim()
  if (!reason) {
    toast.error('Comment is required when returning a submission.')
    return
  }
  void onReturn(reason)
}

async function onReject(reason: string) {
  if (!props.submissionId || pending.value) return
  try {
    await reject.mutateAsync({
      submissionId: props.submissionId,
      body: {
        comments: reason,
        requestId: crypto.randomUUID(),
      },
    })
    comments.value = ''
    toast.success('Submission rejected.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Reject failed.')
  }
}

function requestReject() {
  const reason = comments.value.trim()
  if (!reason) {
    toast.error('Comment is required when rejecting a submission.')
    return
  }
  void onReject(reason)
}

function downloadSummary() {
  const ex = exercise.value
  const submitted = details.value
  if (!ex || !submitted) return
  const lines = [
    `RST Submission Summary`,
    `Exercise: ${submitted.exerciseCode}`,
    `Toolkit: ${ex.snapshot.toolkit.name}`,
    `Official Scenario: ${submitted.scenarioName ?? submitted.scenarioId}`,
    `Submitted at: ${formatDateTime(submitted.submittedAt)}`,
    `Delivery HC: ${deliveryHc.value.toFixed(2)}`,
    `Right Sizing HC: ${formatHc(rightSizingHc.value)}`,
    `Production Support: ${supportFte.value != null ? supportFte.value.toFixed(2) : '—'}`,
    `Capacity Creation: ${formatSigned(capacityCreation.value)}`,
    `Approval: ${workspace.value?.statusBar.label ?? submitted.submissionStatus}`,
    ...(workspace.value?.statusBar.step
      ? [`Status step: ${workspace.value.statusBar.step}`]
      : []),
    ...(workspace.value?.currentHop
      ? [
          `Current step: ${workspace.value.currentHop.step ?? '—'}`,
          `Current reviewer: ${workspace.value.currentHop.reviewer ?? '—'}`,
        ]
      : []),
    ...(workspace.value?.nextStep
      ? [`After approve: ${workspace.value.nextStep}`]
      : []),
    ...(workspace.value?.history ?? []).map(
      (row) =>
        `${row.step}: ${row.decision} by ${row.actor ?? '—'} (${formatDateTime(row.completedAt)}) ${row.comments?.trim() || ''}`,
    ),
    `Submission status: ${submitted.submissionStatus}`,
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${submitted.exerciseCode}-summary.txt`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <ListLoading v-if="loading" class="h-48" />
  <div v-else-if="details && exercise" class="grid gap-4">
    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="
            router.push({
              name: isApprover ? 'approver-queue' : 'supervisor-exercises',
            })
          "
        >
          {{ isApprover ? '← Back to Approval Queue' : '← Back to Exercise List' }}
        </Button>
      </template>
      <Button v-if="isApprover" variant="outline" @click="downloadSummary">
        Download Summary
      </Button>
      <Button
        v-else
        variant="link"
        class="h-auto px-0 font-semibold"
        @click="
          router.push({
            name: exercise?.canEdit ? 'supervisor-exercise-detail' : 'supervisor-exercise-snapshot',
            params: { id: resolvedExerciseId },
          })
        "
      >
        {{ exercise?.canEdit ? 'Open Exercise' : 'View Exercise Snapshot' }}
      </Button>
    </PageActions>

    <TimesheetAlignmentAlert
      :audience="isApprover ? 'approval' : 'exercise'"
      :alignment="exercise.timesheetAlignment"
      :frozen-delivery-hc="exercise.deliveryHc ?? deliveryHc"
      :frozen-sync-date="exercise.snapshot.timesheetSyncDate"
    />

    <div class="flex gap-1 border-b">
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm"
        :class="
          pageTab === 'exercise'
            ? 'border-primary font-semibold text-primary'
            : 'border-transparent text-muted-foreground'
        "
        @click="pageTab = 'exercise'"
      >
        Submitted Exercise
      </button>
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm"
        :class="
          pageTab === 'approval'
            ? 'border-primary font-semibold text-primary'
            : 'border-transparent text-muted-foreground'
        "
        @click="pageTab = 'approval'"
      >
        Approval
      </button>
    </div>

    <div v-if="pageTab === 'exercise'" class="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Official Scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailTable :rows="packageRows">
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
            <template #medianSource="{ row }">
              <Badge :variant="medianSourceLabel === 'Manual' ? 'secondary' : 'outline'">
                {{ row.value || '—' }}
              </Badge>
            </template>
            <template #capacityCreation="{ row }">
              <span
                class="font-semibold"
                :class="{
                  'text-emerald-600': (capacityCreation ?? 0) >= 0 && capacityCreation != null,
                  'text-destructive': (capacityCreation ?? 0) < 0,
                }"
              >
                {{ row.value || '—' }}
              </span>
            </template>
          </DetailTable>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Shared KPI Line Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="min-w-0 overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carrier</TableHead>
                  <TableHead>GBS Site</TableHead>
                  <TableHead>Customer Country</TableHead>
                  <TableHead>Delivery HC</TableHead>
                  <TableHead>Right Sizing HC</TableHead>
                  <TableHead>Capacity Creation (HC)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(row, index) in kpiAllocationRows" :key="index">
                  <TableCell>{{ row.carrier }}</TableCell>
                  <TableCell>{{ row.site }}</TableCell>
                  <TableCell>{{ row.customerCountry }}</TableCell>
                  <TableCell>{{ row.deliveryHc }}</TableCell>
                  <TableCell>{{ row.rightSizingHc }}</TableCell>
                  <TableCell
                    class="font-semibold"
                    :class="{
                      'text-emerald-600': (row.capacityValue ?? 0) >= 0 && row.capacityValue != null,
                      'text-destructive': (row.capacityValue ?? 0) < 0,
                    }"
                  >
                    {{ row.capacityCreation }}
                  </TableCell>
                </TableRow>
                <TableRow v-if="!kpiAllocationRows.length">
                  <TableCell colspan="6" class="h-16 text-center text-muted-foreground">
                    No Shared KPI lines on this exercise.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AssociatedDataPanel
        :key="`${exercise.id}-${exercise.sizingMonth}-${exercise.slotStartDate}-${exercise.slotWeeks}`"
        :exercise-id="resolvedExerciseId"
        :sizing-month="exercise.sizingMonth"
        :slot-start-date="exercise.slotStartDate"
        :slot-weeks="exercise.slotWeeks"
        read-only
      />

      <Card v-if="hasTrainingObservations">
        <CardHeader>
          <CardTitle class="text-base">Training data used</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4">
          <p class="text-xs leading-relaxed text-muted-foreground">
            Frozen actuals that fed the official scenario forecast when this exercise was approved.
          </p>
          <div class="grid gap-4 lg:grid-cols-2">
            <div class="space-y-2">
              <h4 class="text-sm font-semibold">Monthly</h4>
              <div class="max-h-80 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Actual Volume</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="row in trainingBundle?.monthly ?? []"
                      :key="row.periodStart"
                    >
                      <TableCell>{{ trainingPeriodLabel(row) }}</TableCell>
                      <TableCell>{{ formatNumber(row.actualVolume, 2) }}</TableCell>
                      <TableCell>{{ row.source }}</TableCell>
                    </TableRow>
                    <TableRow v-if="!(trainingBundle?.monthly.length ?? 0)">
                      <TableCell colspan="3" class="h-16 text-center text-muted-foreground">
                        No monthly training observations.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div class="space-y-2">
              <h4 class="text-sm font-semibold">Daily</h4>
              <div class="max-h-80 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Actual Volume</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="row in trainingBundle?.daily ?? []" :key="row.periodStart">
                      <TableCell>{{ trainingPeriodLabel(row) }}</TableCell>
                      <TableCell>{{ formatNumber(row.actualVolume, 2) }}</TableCell>
                      <TableCell>{{ row.source }}</TableCell>
                    </TableRow>
                    <TableRow v-if="!(trainingBundle?.daily.length ?? 0)">
                      <TableCell colspan="3" class="h-16 text-center text-muted-foreground">
                        No daily training observations.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="grid items-start gap-3.5 lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)]">
        <Card class="min-w-0">
          <CardHeader>
            <CardTitle class="text-base">Forecast &amp; Simulation</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="flex gap-1 border-b">
              <button
                type="button"
                class="border-b-2 px-3 py-2 text-sm"
                :class="
                  simulationTab === 'sizing'
                    ? 'border-primary font-semibold text-primary'
                    : 'border-transparent text-muted-foreground'
                "
                @click="simulationTab = 'sizing'"
              >
                Sizing Simulation
              </button>
              <button
                type="button"
                class="border-b-2 px-3 py-2 text-sm"
                :class="
                  simulationTab === 'slot'
                    ? 'border-primary font-semibold text-primary'
                    : 'border-transparent text-muted-foreground'
                "
                @click="simulationTab = 'slot'"
              >
                Slot Simulation
              </button>
            </div>

            <SizingSimulationCharts
              v-if="simulationTab === 'sizing' && hasSizing"
              :exercise-id="resolvedExerciseId"
              :sizing-month="exercise.sizingMonth"
              :monthly="latestMonthlySizing"
              :daily="latestDailySizing"
              :team-setup="teamSetup"
            />
            <div
              v-else-if="simulationTab === 'sizing'"
              class="rounded-md border border-dashed px-3 py-10 text-center text-sm text-muted-foreground"
            >
              No saved sizing simulation for the official scenario.
            </div>

            <template v-else-if="simulationTab === 'slot' && hasSlot && latestSlotSimulation">
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                </div>
                <div class="rounded-md border px-3 py-2.5">
                  <div class="text-xs text-muted-foreground">Shift setup</div>
                  <div class="mt-1 font-semibold">{{ latestSlotSimulation.shiftCount }}</div>
                  <div class="mt-0.5 text-xs text-muted-foreground">{{ shiftSetupLabel }}</div>
                </div>
              </div>
              <SlotSimulationCharts :simulation="latestSlotSimulation" />
            </template>
            <div
              v-else
              class="rounded-md border border-dashed px-3 py-10 text-center text-sm text-muted-foreground"
            >
              No saved slot simulation for the official scenario.
            </div>
          </CardContent>
        </Card>

        <Card class="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle class="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailTable :rows="resultRows">
              <template #capacityCreation="{ row }">
                <span
                  class="font-semibold"
                  :class="{
                    'text-emerald-600': (capacityCreation ?? 0) >= 0 && capacityCreation != null,
                    'text-destructive': (capacityCreation ?? 0) < 0,
                  }"
                >
                  {{ row.value || '—' }}
                </span>
              </template>
            </DetailTable>
          </CardContent>
        </Card>
      </div>
    </div>

    <div v-else-if="workspace" class="grid gap-4">
      <ApprovalInProgressPanel
        v-if="inProgress"
        :workspace="workspace"
        :comments="comments"
        :pending="pending"
        @update:comments="comments = $event"
        @approve="onApprove"
        @return="requestReturn"
        @reject="requestReject"
      />
      <ApprovalCompletedPanel v-else :workspace="workspace" />
    </div>

    <ToolkitInfoDialog
      v-model:open="toolkitInfoOpen"
      :snapshot="exercise.snapshot"
      :alignment="exercise.timesheetAlignment"
    />
  </div>
  <div v-else class="py-16 text-center text-sm text-muted-foreground">
    Submitted details are unavailable for this exercise.
  </div>
</template>
