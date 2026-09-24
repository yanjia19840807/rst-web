<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import DetailTable from '@/components/DetailTable.vue'
import TabStrip from '@/components/TabStrip.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
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
import { exerciseApi } from '../api'
import { triggerDownload } from '../downloadBlob'
import { randomId } from '@/lib/randomId'
import { capacityTone, measuredRightSizingHc } from '@/lib/hcFormat'
import { useApprovalMutations } from '@/features/approval/api/mutations'
import { useApprovalDetailQuery } from '@/features/approval/api/queries'
import {
  approvalQueueBackLabel,
  approvalQueueLocation,
} from '@/features/approval/approvalQueueTabs'
import ApprovalCompletedPanel from '@/features/approval/components/ApprovalCompletedPanel.vue'
import ApprovalInProgressPanel from '@/features/approval/components/ApprovalInProgressPanel.vue'
import { historyFromActions } from '@/features/approval/historyFromActions'
import type { ApprovalDetailView } from '@/features/approval/types'

import {
  useCycleTimeActiveQuery,
  useExerciseQuery,
  useLatestDailySimulationQuery,
  useLatestMonthlySizingQuery,
  useLatestSlotSimulationQuery,
  useScenarioQuery,
  useSubmittedDetailsQuery,
  useSupportQuery,
  useTeamSetupQuery,
} from '../api/queries'
import { FieldUnit, withUnit } from '../fieldUnits'
import { slaMinutesToHours } from '../schemas/teamSetup'
import { actualHeadcount } from '../sizingChartMath'
import type { SubmittedDetails } from '../types'
import { exerciseListBackLabel, exerciseListLocation } from '../workflowLabels'
import { sumSupportFte } from './associated-data/supportOptions'
import AssociatedDataPanel from './AssociatedDataPanel.vue'
import ExerciseDetailHeader from './ExerciseDetailHeader.vue'
import ValidationFindingsTable from './ValidationFindingsTable.vue'
import SizingSimulationCharts from './SizingSimulationCharts.vue'
import SlotSimulationCharts from './SlotSimulationCharts.vue'

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
const route = useRoute()
const pageTab = ref<'exercise' | 'approval'>('exercise')
const comments = ref('')
const redirected = ref(false)
const downloadPending = ref(false)

const { approve, returnToSupervisor } = useApprovalMutations()
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
    findings: detail.findings ?? [],
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
const pending = computed(
  () =>
    approve.isPending.value || returnToSupervisor.isPending.value,
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
  void router.push(
    isApprover.value
      ? queueLocation.value
      : { name: 'supervisor-exercise-detail', params: { id: props.exerciseId } },
  )
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
const queueLocation = computed(() =>
  approvalQueueLocation(route.query.tab, workspace.value?.mode),
)
const queueBackLabel = computed(() =>
  approvalQueueBackLabel(route.query.tab, workspace.value?.mode),
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

const medianLabel = computed(() => {
  if (!cycleTime.value) return '—'
  const seconds = Number(cycleTime.value.medianSeconds).toFixed(2)
  const source =
    cycleTime.value.baselineType?.toUpperCase() === 'MANUAL' ? 'Manual' : 'System-calculated'
  return `${seconds} ${source}`
})

const slaTargetLabel = computed(() => {
  const ratio = teamSetup.value?.slaTargetRatio
  if (ratio == null) return '—'
  return String(Math.round(Number(ratio) * 100))
})

const slaTurntimeLabel = computed(() => {
  const hours = slaMinutesToHours(teamSetup.value?.slaTurnaroundMinutes)
  if (hours == null) return '—'
  return hours.toFixed(2)
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
  const ex = exercise.value
  const submitted = details.value
  if (!ex || !submitted) return []
  return [
    {
      label: 'Official Scenario',
      value: submitted.scenarioName ?? submitted.scenarioId,
    },
    {
      key: 'capacityCreation',
      label: withUnit('Capacity Creation', FieldUnit.hc),
      value: formatSigned(capacityCreation.value),
    },
    { label: withUnit('Actual size', FieldUnit.hc), value: actualSize.value.toFixed(2) },
    { label: withUnit('Right size', FieldUnit.hc), value: formatHc(rightSizingHc.value) },
    {
      label: withUnit('Production support', FieldUnit.fte),
      value: supportFte.value != null ? supportFte.value.toFixed(2) : '—',
    },
    { label: withUnit('Shift Setup', FieldUnit.shifts), value: shiftSetupLabel.value },
    { label: withUnit('SLA Target', FieldUnit.percent), value: slaTargetLabel.value },
    { label: withUnit('SLA Turntime', FieldUnit.hours), value: slaTurntimeLabel.value },
    { label: withUnit('Median Cycle Time', FieldUnit.seconds), value: medianLabel.value },
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

async function onApprove() {
  if (!props.submissionId || pending.value) return
  try {
    await approve.mutateAsync({
      submissionId: props.submissionId,
      body: {
        comments: comments.value.trim() || null,
        requestId: randomId(),
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
        requestId: randomId(),
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

async function downloadSummary() {
  if (!resolvedExerciseId.value || downloadPending.value) return
  downloadPending.value = true
  try {
    const result = await exerciseApi.downloadSummary(resolvedExerciseId.value)
    triggerDownload(result.blob, result.filename)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Download failed.')
  } finally {
    downloadPending.value = false
  }
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
            router.push(
              isApprover
                ? queueLocation
                : exerciseListLocation(exercise?.workflowStatus ?? details?.workflowStatus),
            )
          "
        >
          {{
            isApprover
              ? queueBackLabel
              : exerciseListBackLabel(exercise?.workflowStatus ?? details?.workflowStatus)
          }}
        </Button>
      </template>
      <Button
        v-if="isApprover"
        variant="outline"
        :loading="downloadPending"
        @click="downloadSummary"
      >
        {{ downloadPending ? 'Downloading…' : 'Download Summary' }}
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
      v-if="!isApprover || inProgress"
      :audience="isApprover ? 'approval' : 'exercise'"
      :alignment="exercise.timesheetAlignment"
      :frozen-delivery-hc="exercise.deliveryHc ?? deliveryHc"
      :frozen-sync-date="exercise.snapshot.timesheetSyncDate"
    />

    <TabStrip
      :tabs="[
        { key: 'exercise', label: 'Submitted Exercise' },
        { key: 'approval', label: 'Approval' },
      ]"
      :model-value="pageTab"
      @update:model-value="pageTab = $event"
    />

    <div v-if="pageTab === 'exercise'" class="grid gap-4">
      <ExerciseDetailHeader :exercise="exercise" locked submitted />

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Official Scenario</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4">
          <section class="grid gap-3">
            <DetailTable :rows="packageRows" :columns="2">
              <template #capacityCreation="{ row }">
                <span :class="capacityTone(capacityCreation) || 'font-semibold'">
                  {{ row.value || '—' }}
                </span>
              </template>
            </DetailTable>
          </section>

          <section class="grid gap-3 border-t pt-4">
            <h3 class="text-sm font-semibold">Shared KPI Line Allocation</h3>
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
                    <TableCell :class="capacityTone(row.capacityValue) || 'font-semibold'">
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
          </section>
        </CardContent>
      </Card>

      <AssociatedDataPanel
        :key="`${exercise.id}-${exercise.sizingMonth}-${exercise.slotStartDate}-${exercise.slotWeeks}-${exercise.tmsFrom}-${exercise.tmsTo}`"
        :exercise-id="resolvedExerciseId"
        :sizing-month="exercise.sizingMonth"
        :slot-start-date="exercise.slotStartDate"
        :slot-weeks="exercise.slotWeeks"
        :tms-from="exercise.tmsFrom"
        :tms-to="exercise.tmsTo"
        read-only
      />

      <Card class="min-w-0">
        <CardHeader>
          <CardTitle class="text-base">1. Sizing Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <SizingSimulationCharts
            v-if="hasSizing"
            :exercise-id="resolvedExerciseId"
            :sizing-month="exercise.sizingMonth"
            :monthly="latestMonthlySizing"
            :daily="latestDailySizing"
            :team-setup="teamSetup"
          />
          <div
            v-else
            class="rounded-md border border-dashed px-3 py-10 text-center text-sm text-muted-foreground"
          >
            No saved sizing simulation for the official scenario.
          </div>
        </CardContent>
      </Card>

      <Card class="min-w-0">
        <CardHeader>
          <CardTitle class="text-base">2. Slot Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <template v-if="hasSlot && latestSlotSimulation">
            <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div class="rounded-md border px-3 py-2.5">
                <div class="text-xs text-muted-foreground">TAT on period (%)</div>
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
                  {{ (Number(latestSlotSimulation.tatOnPeriod) * 100).toFixed(2) }}
                </div>
                <div class="mt-0.5 text-xs text-muted-foreground">
                  Target
                  {{
                    latestSlotSimulation.slaTargetRatio == null
                      ? '—'
                      : Math.round(Number(latestSlotSimulation.slaTargetRatio) * 100)
                  }}
                </div>
              </div>
              <div class="rounded-md border px-3 py-2.5">
                <div class="text-xs text-muted-foreground">Actual vs theoretical (%)</div>
                <div class="mt-1 font-semibold">
                  {{ (Number(latestSlotSimulation.actualVsTheoretical) * 100).toFixed(0) }}
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
    </div>

    <div v-else-if="workspace" class="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Validation Result</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-3">
          <p class="text-xs text-muted-foreground">
            Captured at Submit. Daily vs Monthly and TMS ratio on this exercise.
          </p>
          <ValidationFindingsTable
            :findings="details.findings ?? []"
            empty-text="No submit-time validation findings were stored for this exercise."
          />
        </CardContent>
      </Card>

      <ApprovalInProgressPanel
        v-if="inProgress"
        :workspace="workspace"
        :comments="comments"
        :pending="pending"
        :center="exercise?.snapshot.toolkit.center"
        @update:comments="comments = $event"
        @approve="onApprove"
        @return="requestReturn"
      />
      <ApprovalCompletedPanel v-else :workspace="workspace" :center="exercise?.snapshot.toolkit.center" />
    </div>

  </div>
  <div v-else class="py-16 text-center text-sm text-muted-foreground">
    Submitted details are unavailable for this exercise.
  </div>
</template>
