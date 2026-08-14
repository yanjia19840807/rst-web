<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import DetailTable from '@/components/DetailTable.vue'
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
import { formatDate, formatDateTime, formatMonth } from '@/lib/datetime'
import { approvalApi } from '@/features/approval/api'
import ApprovalCompletedPanel from '@/features/approval/components/ApprovalCompletedPanel.vue'
import ApprovalInProgressPanel from '@/features/approval/components/ApprovalInProgressPanel.vue'
import { historyFromActions } from '@/features/approval/historyFromActions'
import type { ApprovalDetailView } from '@/features/approval/types'

import { exerciseApi } from '../api'
import { deriveSizingWindows, deriveSlotPeriodLabel } from '../periodWindows'
import type {
  CycleTimeBaseline,
  DailySizingView,
  Exercise,
  MonthlySizingView,
  Scenario,
  SlotSimulationView,
  SubmittedDetails,
  SupportItem,
  TeamSetup,
} from '../types'
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
const resolvedExerciseId = computed(() => exercise.value?.id ?? props.exerciseId ?? '')

const router = useRouter()
const loading = ref(true)
const pending = ref(false)
const pageTab = ref<'exercise' | 'approval'>('exercise')
const simulationTab = ref<'sizing' | 'slot'>('sizing')
const toolkitInfoOpen = ref(false)
const details = ref<SubmittedDetails | null>(null)
const exercise = ref<Exercise | null>(null)
const scenario = ref<Scenario | null>(null)
const teamSetup = ref<TeamSetup | null>(null)
const support = ref<SupportItem[]>([])
const cycleTime = ref<CycleTimeBaseline | null>(null)
const latestMonthlySizing = ref<MonthlySizingView | null>(null)
const latestDailySizing = ref<DailySizingView | null>(null)
const latestSlotSimulation = ref<SlotSimulationView | null>(null)
const comments = ref('')

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

const supportFte = computed(() => {
  if (!support.value.length) return null
  return support.value.reduce((sum, item) => sum + (Number(item.supportFte) || 0), 0)
})

const rightSizingHc = computed(() => {
  const fromSizing = latestMonthlySizing.value?.rows[0]?.rightSizingHc
  if (fromSizing != null) return Number(fromSizing)
  const assumption = scenario.value?.assumptions.find((item) => item.parameterCode === 'RIGHT_SIZING_HC')
  return assumption?.numericValue != null ? Number(assumption.numericValue) : null
})

const capacityCreation = computed(() => {
  const fromSizing = latestMonthlySizing.value?.rows[0]?.capacityCreation
  if (fromSizing != null) return Number(fromSizing)
  const rs = rightSizingHc.value
  if (rs == null || supportFte.value == null) return null
  return deliveryHc.value - rs - supportFte.value
})

const shiftSetupLabel = computed(() => {
  const fromSlot = latestSlotSimulation.value?.shiftCount
  const n = fromSlot ?? scenario.value?.shifts?.length ?? 0
  if (n <= 0) return '—'
  return n === 1 ? '1 shift' : `${n} shifts`
})

const medianLabel = computed(() =>
  cycleTime.value ? `${Number(cycleTime.value.medianSeconds).toFixed(2)}s` : '—',
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
  return `${Math.round(Number(ratio) * 100)}%`
})

const slaTurntimeLabel = computed(() => {
  const minutes = teamSetup.value?.slaTurnaroundMinutes
  if (minutes == null) return '—'
  return `${(Number(minutes) / 60).toFixed(2)} business hours`
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
    { label: 'Month train', value: windows?.monthTrain },
    { label: 'Month forecast', value: windows?.monthForecast },
    { label: 'Daily train', value: windows?.dailyTrain },
    { label: 'Daily forecast', value: windows?.dailyForecast },
    {
      label: 'Slot Period',
      value: deriveSlotPeriodLabel(ex.slotStartDate, ex.slotWeeks),
    },
    { label: 'TMS period', value: `${formatDate(ex.tmsFrom)} – ${formatDate(ex.tmsTo)}` },
    { label: 'Actual size', value: deliveryHc.value.toFixed(2) },
    { label: 'SLA Turntime', value: slaTurntimeLabel.value },
    { label: 'SLA Target %', value: slaTargetLabel.value },
    { label: 'Shift Setup', value: shiftSetupLabel.value },
    { label: 'Median Cycle Time', value: medianLabel.value },
    { key: 'medianSource', label: 'Median source', value: medianSourceLabel.value },
    {
      label: 'Production support',
      value: supportFte.value != null ? supportFte.value.toFixed(2) : '—',
    },
    { label: 'Right size HC', value: formatHc(rightSizingHc.value) },
    { key: 'capacityCreation', label: 'Capacity Creation', value: formatSigned(capacityCreation.value) },
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
  { label: 'Actual size', value: deliveryHc.value.toFixed(2) },
  { label: 'SLA Turntime', value: slaTurntimeLabel.value },
  { label: 'SLA Target %', value: slaTargetLabel.value },
  { label: 'Shift Setup', value: shiftSetupLabel.value },
  { label: 'Median Cycle Time', value: medianLabel.value },
  { label: 'Median source', value: medianSourceLabel.value },
  {
    label: 'Production support',
    value: supportFte.value != null ? supportFte.value.toFixed(2) : '—',
  },
  { label: 'Right size HC', value: formatHc(rightSizingHc.value) },
  { key: 'capacityCreation', label: 'Capacity Creation', value: formatSigned(capacityCreation.value) },
])

async function loadOfficialScenario(exerciseId: string, scenarioId: string) {
  scenario.value = await exerciseApi.getScenario(exerciseId, scenarioId).catch(() => null)
  const [ts, sp, monthly, daily, slot] = await Promise.all([
    exerciseApi.getTeamSetup(exerciseId).catch(() => null),
    exerciseApi.listSupport(exerciseId).catch(() => [] as SupportItem[]),
    exerciseApi.getLatestMonthlySizing(exerciseId, scenarioId).catch(() => null),
    exerciseApi.getLatestDailySimulation(exerciseId, scenarioId).catch(() => null),
    exerciseApi.getLatestSlotSimulation(exerciseId, scenarioId).catch(() => null),
  ])
  teamSetup.value = ts
  support.value = sp
  latestMonthlySizing.value = monthly
  latestDailySizing.value = daily
  latestSlotSimulation.value = slot
  try {
    cycleTime.value = await exerciseApi.getActiveCycleTime(exerciseId)
  } catch {
    cycleTime.value = null
  }
}

function applyApprovalDetail(detail: ApprovalDetailView) {
  details.value = {
    exerciseId: detail.exerciseId,
    exerciseCode: detail.exerciseCode,
    workflowStatus: detail.workflowStatus,
    submittedAt: detail.submittedAt,
    officialPackageId: detail.officialPackageId,
    packageVersion: detail.packageVersion,
    packageStatus: detail.packageStatus,
    scenarioId: detail.scenarioId,
    scenarioName: detail.scenarioName,
    submissionId: detail.submissionId,
    submissionCode: detail.submissionCode,
    submissionStatus: detail.submissionStatus,
    currentStep: detail.currentStep,
    requiredRole: detail.requiredRole,
    remarks: detail.remarks,
    scopes: detail.scopes,
    workflowInstanceId: detail.workflowInstanceId,
    workflowStatusLabel: detail.workflowStatusLabel,
    steps: detail.steps,
    actions: detail.actions,
    canDecide: detail.canDecide,
    workspace: detail.workspace,
  }
}

async function load() {
  loading.value = true
  try {
    if (isApprover.value) {
      if (!props.submissionId) throw new Error('Missing submission id.')
      const approval = await approvalApi.detail(props.submissionId)
      applyApprovalDetail(approval)
      exercise.value = await exerciseApi.detail(approval.exerciseId)
    } else {
      if (!props.exerciseId) throw new Error('Missing exercise id.')
      ;[details.value, exercise.value] = await Promise.all([
        exerciseApi.submittedDetails(props.exerciseId),
        exerciseApi.detail(props.exerciseId),
      ])
    }
    const scenarioId = details.value?.scenarioId || exercise.value?.officialScenarioId
    const exerciseId = exercise.value?.id
    if (scenarioId && exerciseId) {
      await loadOfficialScenario(exerciseId, scenarioId)
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load submitted details.')
    void router.push({
      name: isApprover.value ? 'approver-queue' : 'supervisor-exercise-detail',
      params: isApprover.value ? undefined : { id: props.exerciseId },
    })
  } finally {
    loading.value = false
  }
}

async function onApprove() {
  if (!props.submissionId || pending.value) return
  pending.value = true
  try {
    applyApprovalDetail(
      await approvalApi.approve(props.submissionId, {
        comments: comments.value.trim() || null,
        requestId: crypto.randomUUID(),
      }),
    )
    toast.success('Submission approved.')
    comments.value = ''
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Approve failed.')
  } finally {
    pending.value = false
  }
}

async function onReturn(reason: string) {
  if (!props.submissionId || pending.value) return
  pending.value = true
  try {
    applyApprovalDetail(
      await approvalApi.returnToSupervisor(props.submissionId, {
        comments: reason,
        requestId: crypto.randomUUID(),
      }),
    )
    comments.value = ''
    toast.success('Returned to supervisor.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Return failed.')
  } finally {
    pending.value = false
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

watch(
  () => [props.exerciseId, props.submissionId, props.mode] as const,
  () => {
    void load()
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="loading" class="py-16 text-center text-sm text-muted-foreground">
    Loading submitted details…
  </div>
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
          <CardTitle class="text-base">Official Scenario Package</CardTitle>
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
          <div class="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carrier</TableHead>
                  <TableHead>GBS Site</TableHead>
                  <TableHead>Customer Country</TableHead>
                  <TableHead>Delivery HC</TableHead>
                  <TableHead>Right Sizing HC</TableHead>
                  <TableHead>Capacity Creation</TableHead>
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
              :monthly="latestMonthlySizing"
              :daily="latestDailySizing"
              :sla-target-ratio="teamSetup?.slaTargetRatio ?? null"
            />
            <div
              v-else-if="simulationTab === 'sizing'"
              class="rounded-md border border-dashed px-3 py-10 text-center text-sm text-muted-foreground"
            >
              No saved sizing simulation for the official scenario.
            </div>

            <template v-else-if="simulationTab === 'slot' && hasSlot && latestSlotSimulation">
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <div class="rounded-md border px-3 py-2.5">
                  <div class="text-xs text-muted-foreground">Applicability</div>
                  <div class="mt-1 font-semibold">
                    {{ latestSlotSimulation.applicability ? 'On' : 'Off' }}
                  </div>
                </div>
              </div>
              <SlotSimulationCharts :chart="latestSlotSimulation.chart" />
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
      />
      <ApprovalCompletedPanel v-else :workspace="workspace" />
    </div>

    <ToolkitInfoDialog v-model:open="toolkitInfoOpen" :snapshot="exercise.snapshot" />
  </div>
  <div v-else class="py-16 text-center text-sm text-muted-foreground">
    Submitted details are unavailable for this exercise.
  </div>
</template>
