<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ApprovalCompletedPanel from '@/features/approval/components/ApprovalCompletedPanel.vue'
import { historyFromActions } from '@/features/approval/historyFromActions'
import { formatDate } from '@/lib/datetime'

import { exerciseApi } from '../api'
import { sizingHintLines, slotHintLines } from '../periodWindows'
import type { CycleTimeBaseline, Exercise, Scenario, SubmittedDetails, SupportItem, TeamSetup } from '../types'
import { exerciseStatusLabel } from '../workflowLabels'
import AssociatedDataPanel from './AssociatedDataPanel.vue'
import EditExercisePeriodsDialog from './EditExercisePeriodsDialog.vue'
import PeriodDerivedHints from './PeriodDerivedHints.vue'
import SubmitDialog from './SubmitDialog.vue'
import ToolkitInfoDialog from './ToolkitInfoDialog.vue'

const props = defineProps<{
  exerciseId: string
}>()

const route = useRoute()
const router = useRouter()
const snapshotMode = computed(() => route.name === 'supervisor-exercise-snapshot')
const loading = ref(true)
const exercise = ref<Exercise | null>(null)
const scenarios = ref<Scenario[]>([])
const selectedId = ref<string | null>(null)
const teamSetup = ref<TeamSetup | null>(null)
const support = ref<SupportItem[]>([])
const cycleTime = ref<CycleTimeBaseline | null>(null)
const deleteOpen = ref(false)
const deletePending = ref(false)
const newScenarioOpen = ref(false)
const createPending = ref(false)
const officialOpen = ref(false)
const officialPending = ref(false)
const submitOpen = ref(false)
const toolkitInfoOpen = ref(false)
const periodsEditOpen = ref(false)
const pageTab = ref<'exercise' | 'approval'>('exercise')
const submitted = ref<SubmittedDetails | null>(null)
const historyError = ref(false)

const workspace = computed(() => {
  const raw = submitted.value?.workspace
  if (!raw) return null
  if (raw.history?.length) return raw
  return {
    ...raw,
    history: historyFromActions(submitted.value?.actions ?? []),
  }
})
const hasApprovalHistory = computed(
  () =>
    Boolean(exercise.value?.submittedAt) || exercise.value?.workflowStatus === 'RETURNED',
)
const showApprovalTab = computed(() => !snapshotMode.value && Boolean(exercise.value))

const locked = computed(() => !exercise.value?.canEdit)
const nextScenarioCode = computed(() => {
  let max = 0
  for (const scenario of scenarios.value) {
    const match = /^S(\d+)$/i.exec(scenario.scenarioCode?.trim() ?? '')
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `S${max + 1}`
})
const selectedScenario = computed(
  () => scenarios.value.find((item) => item.id === selectedId.value) ?? null,
)
const deliveryHc = computed(() =>
  (exercise.value?.snapshot.sharedKpis ?? []).reduce((sum, item) => sum + Number(item.deliveryHc), 0),
)
const supportFte = computed(() => {
  if (!support.value.length) return null
  return support.value.reduce((sum, item) => sum + (Number(item.supportFte) || 0), 0)
})
const medianLabel = computed(() =>
  cycleTime.value ? `${Number(cycleTime.value.medianSeconds).toFixed(2)}s` : '—',
)
const slaTargetLabel = computed(() => {
  const ratio = teamSetup.value?.slaTargetRatio
  if (ratio == null) return '—'
  return `${(Number(ratio) * 100).toFixed(2)}%`
})
const shiftSetupLabel = computed(() => {
  const n = selectedScenario.value?.shifts?.length ?? 0
  if (n <= 0) return '—'
  return n === 1 ? '1 shift' : `${n} shifts`
})

function assumptionHc(scenario: Scenario) {
  const row = scenario.assumptions.find((item) => item.parameterCode === 'RIGHT_SIZING_HC')
  return row?.numericValue != null ? Number(row.numericValue) : null
}

function capacityCreation(scenario: Scenario) {
  const rs = assumptionHc(scenario)
  if (rs == null || supportFte.value == null) return null
  return deliveryHc.value - rs - supportFte.value
}

function formatSigned(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}
const sizingHints = computed(() =>
  exercise.value ? sizingHintLines(exercise.value.sizingMonth) : [],
)
const slotHints = computed(() =>
  exercise.value
    ? slotHintLines(exercise.value.slotStartDate, exercise.value.slotWeeks)
    : [],
)
const slotPeriodSummary = computed(() => {
  if (!exercise.value) return '—'
  const weeks = exercise.value.slotWeeks
  const weekLabel = weeks === 1 ? '1 week' : `${weeks} weeks`
  return `${formatDate(exercise.value.slotStartDate)} · ${weekLabel}`
})

function onPeriodsSaved(updated: Exercise) {
  exercise.value = updated
}

async function load() {
  loading.value = true
  try {
    ;[exercise.value, scenarios.value] = await Promise.all([
      exerciseApi.detail(props.exerciseId),
      exerciseApi.listScenarios(props.exerciseId),
    ])
    if (exercise.value.officialScenarioId) {
      selectedId.value = exercise.value.officialScenarioId
    }
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
    submitted.value = null
    historyError.value = false
    if (hasApprovalHistory.value) {
      try {
        submitted.value = await exerciseApi.submittedDetails(props.exerciseId)
      } catch {
        submitted.value = null
        historyError.value = true
      }
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load exercise.')
    void router.push({ name: 'supervisor-exercises' })
  } finally {
    loading.value = false
  }
}

async function confirmDelete() {
  deletePending.value = true
  try {
    await exerciseApi.delete(props.exerciseId)
    toast.success('Exercise deleted.')
    void router.push({ name: 'supervisor-exercises' })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Delete failed.')
  } finally {
    deletePending.value = false
    deleteOpen.value = false
  }
}

async function createScenario() {
  if (!exercise.value) return
  createPending.value = true
  try {
    const created = await exerciseApi.createScenario(props.exerciseId, {
      scenarioCode: nextScenarioCode.value,
      name: `${exercise.value.snapshot.toolkit.name} ${nextScenarioCode.value}`,
      description: null,
      assumptions: [{ parameterCode: 'RIGHT_SIZING_HC', numericValue: 0, unit: 'HC' }],
    })
    newScenarioOpen.value = false
    toast.success(`${created.scenarioCode} created.`)
    void router.push({
      name: 'supervisor-scenario-form',
      params: { id: props.exerciseId, scenarioId: created.id },
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not create scenario.')
  } finally {
    createPending.value = false
  }
}

function openOfficialDialog() {
  if (!selectedId.value) {
    toast.warning('Please select a scenario first.')
    return
  }
  officialOpen.value = true
}

async function confirmOfficial() {
  if (!selectedId.value) return
  officialPending.value = true
  try {
    await exerciseApi.markOfficial(props.exerciseId, selectedId.value)
    toast.success('Saved as the official scenario.')
    officialOpen.value = false
    await load()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not mark official.')
  } finally {
    officialPending.value = false
  }
}

function onSubmitted() {
  void router.push({ name: 'supervisor-submission', params: { id: props.exerciseId } })
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="py-16 text-center text-sm text-muted-foreground">
    Loading exercise…
  </div>
  <div v-else-if="exercise" class="grid gap-4">
    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="
            snapshotMode
              ? router.push({ name: 'supervisor-submission', params: { id: exerciseId } })
              : router.push({ name: 'supervisor-exercises' })
          "
        >
          {{ snapshotMode ? '← Back to Submitted Exercise Details' : '← Back to Exercise List' }}
        </Button>
      </template>
      <Button
        v-if="exercise.canDelete"
        variant="destructive"
        @click="deleteOpen = true"
      >
        Delete Exercise
      </Button>
      <Button
        v-if="!snapshotMode && locked && exercise.submittedAt"
        @click="router.push({ name: 'supervisor-submission', params: { id: exerciseId } })"
      >
        Submitted Exercise Details
      </Button>
      <Button v-if="exercise.canSubmit && pageTab === 'exercise'" @click="submitOpen = true">Submit For Validation</Button>
    </PageActions>

    <div v-if="showApprovalTab" class="flex gap-1 border-b">
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
        Exercise
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

    <div v-show="!showApprovalTab || pageTab === 'exercise'" class="grid gap-4">

    <Card>
      <CardHeader class="items-center">
        <CardTitle class="text-base">Exercise Info</CardTitle>
        <CardAction v-if="!locked">
          <Button size="sm" variant="outline" @click="periodsEditOpen = true">Edit</Button>
        </CardAction>
      </CardHeader>
      <CardContent class="grid gap-3">
        <DetailTable
          :rows="[
            { key: 'toolkit', label: 'Toolkit', value: exercise.snapshot.toolkit.name },
            { label: 'Exercise No', value: exercise.exerciseCode },
            { label: 'Created', value: formatDate(exercise.createdAt) },
            { key: 'sizingMonth', label: 'Sizing Month', value: exercise.sizingMonth },
            { key: 'slotPeriod', label: 'Slot Period', value: slotPeriodSummary },
            {
              label: 'TMS period',
              value: `${formatDate(exercise.tmsFrom)} – ${formatDate(exercise.tmsTo)}`,
            },
            { label: 'Status', value: exerciseStatusLabel(exercise) },
            { label: 'Delivery HC', value: deliveryHc.toFixed(2) },
          ]"
        >
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
          <template #sizingMonth="{ row }">
            <div>
              <div>{{ row.value || '—' }}</div>
              <PeriodDerivedHints :lines="sizingHints" />
            </div>
          </template>
          <template #slotPeriod="{ row }">
            <div>
              <div>{{ row.value || '—' }}</div>
              <PeriodDerivedHints :lines="slotHints" />
            </div>
          </template>
        </DetailTable>
        <div
          v-if="!locked"
          class="rounded-md bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-foreground"
        >
          Associated Data initialized from the latest Approved archive. Volume Input covers training
          windows only (not forecast periods); overlapping archive volume is seeded. Edit below —
          all scenarios in this exercise share this baseline.
        </div>
      </CardContent>
    </Card>

    <EditExercisePeriodsDialog
      v-if="exercise"
      v-model:open="periodsEditOpen"
      :exercise="exercise"
      @saved="onPeriodsSaved"
    />

    <ToolkitInfoDialog v-model:open="toolkitInfoOpen" :snapshot="exercise.snapshot" />

    <AssociatedDataPanel
      :key="`${exercise.id}-${exercise.sizingMonth}-${exercise.slotStartDate}-${exercise.slotWeeks}-${exercise.version}`"
      :exercise-id="exerciseId"
      :sizing-month="exercise.sizingMonth"
      :slot-start-date="exercise.slotStartDate"
      :slot-weeks="exercise.slotWeeks"
      :read-only="locked"
    />

    <Card>
      <CardHeader class="items-center">
        <CardTitle class="text-base">Scenario Matrix</CardTitle>
        <CardAction v-if="!locked" class="flex gap-2">
          <Button variant="outline" @click="openOfficialDialog">Save Official Scenario</Button>
          <Button @click="newScenarioOpen = true">New Scenario</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto rounded-lg border">
          <Table class="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead class="w-24 text-center">Is Official</TableHead>
                <TableHead>Scenario</TableHead>
                <TableHead>Actual size</TableHead>
                <TableHead>SLA Target %</TableHead>
                <TableHead>Shift Setup</TableHead>
                <TableHead>Median Cycle Time</TableHead>
                <TableHead>Right size HC</TableHead>
                <TableHead>Capacity Creation</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="scenario in scenarios"
                :key="scenario.id"
                class="cursor-pointer"
                :class="
                  selectedId === scenario.id
                    ? 'bg-primary/5'
                    : scenario.status === 'OFFICIAL'
                      ? 'bg-amber-50'
                      : undefined
                "
                @click="!locked && (selectedId = selectedId === scenario.id ? null : scenario.id)"
              >
                <TableCell class="text-center">
                  <span v-if="scenario.status === 'OFFICIAL'" class="text-amber-500">★</span>
                </TableCell>
                <TableCell>{{ scenario.scenarioCode }}</TableCell>
                <TableCell>{{ deliveryHc.toFixed(2) }}</TableCell>
                <TableCell>{{ slaTargetLabel }}</TableCell>
                <TableCell>{{ shiftSetupLabel }}</TableCell>
                <TableCell>{{ medianLabel }}</TableCell>
                <TableCell>
                  {{
                    assumptionHc(scenario) != null ? assumptionHc(scenario)!.toFixed(2) : '—'
                  }}
                </TableCell>
                <TableCell
                  :class="{
                    'font-semibold text-emerald-600': (capacityCreation(scenario) ?? 0) >= 0
                      && capacityCreation(scenario) != null,
                    'font-semibold text-destructive': (capacityCreation(scenario) ?? 0) < 0,
                  }"
                >
                  {{ formatSigned(capacityCreation(scenario)) }}
                </TableCell>
                <TableCell class="text-right" @click.stop>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    @click="
                      router.push({
                        name: snapshotMode
                          ? 'supervisor-scenario-snapshot'
                          : 'supervisor-scenario-form',
                        params: { id: exerciseId, scenarioId: scenario.id },
                      })
                    "
                  >
                    {{ locked ? 'Open' : 'Edit' }}
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="!scenarios.length">
                <TableCell colspan="9" class="h-24 text-center text-muted-foreground">
                  No scenarios yet. Create one to start simulation.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p v-if="!locked && !selectedId" class="mt-3 text-xs text-muted-foreground">
          Click a row to select a scenario before saving as official.
        </p>
      </CardContent>
    </Card>
    </div>

    <div v-if="showApprovalTab && pageTab === 'approval'">
      <ApprovalCompletedPanel
        :workspace="workspace"
        :empty-message="historyError ? 'Approval history is unavailable.' : 'No approval history yet.'"
      />
    </div>

    <Dialog v-model:open="newScenarioOpen">
      <DialogContent
        class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
          <DialogTitle>Create New Scenario</DialogTitle>
          <DialogDescription>
            A new scenario will be created with the following identity. You can adjust assumptions
            on the next page.
          </DialogDescription>
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div class="rounded-lg border bg-card p-4">
            <DetailTable
              :rows="[
                { label: 'Toolkit', value: exercise.snapshot.toolkit.name },
                { label: 'Exercise NO', value: exercise.exerciseCode },
                { label: 'Scenario NO', value: nextScenarioCode },
              ]"
            />
          </div>
        </div>
        <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
          <Button variant="outline" :disabled="createPending" @click="newScenarioOpen = false">
            Cancel
          </Button>
          <Button :disabled="createPending" @click="createScenario">
            {{ createPending ? 'Creating…' : 'Confirm' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="officialOpen">
      <DialogContent
        class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
          <DialogTitle>Save Official Scenario</DialogTitle>
          <DialogDescription>
            Review the package below and confirm to mark this as the official scenario.
          </DialogDescription>
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div v-if="selectedScenario" class="rounded-lg border bg-card p-4">
            <DetailTable
              :rows="[
                { label: 'Scenario', value: selectedScenario.scenarioCode },
                { label: 'Actual size', value: deliveryHc.toFixed(2) },
                { label: 'SLA Target %', value: slaTargetLabel },
                { label: 'Shift Setup', value: shiftSetupLabel },
                { label: 'Median Cycle Time', value: medianLabel },
                {
                  label: 'Right size HC',
                  value:
                    assumptionHc(selectedScenario) != null
                      ? assumptionHc(selectedScenario)!.toFixed(2)
                      : '—',
                },
                {
                  label: 'Production support',
                  value: supportFte != null ? supportFte.toFixed(2) : '—',
                },
                {
                  label: 'Capacity Creation',
                  value: formatSigned(capacityCreation(selectedScenario)),
                },
              ]"
            />
          </div>
        </div>
        <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
          <Button variant="outline" :disabled="officialPending" @click="officialOpen = false">
            Cancel
          </Button>
          <Button :disabled="officialPending" @click="confirmOfficial">
            {{ officialPending ? 'Saving…' : 'Confirm as Official' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete Exercise"
      warning="This action cannot be undone. All scenarios and unsubmitted data associated with this exercise will be deleted."
      :rows="
        exercise
          ? [
              { label: 'Exercise Code', value: exercise.exerciseCode, strong: true },
              { label: 'Toolkit', value: exercise.snapshot.toolkit.name },
              { label: 'Scenario Count', value: scenarios.length },
            ]
          : []
      "
      confirm-label="Delete Exercise"
      :pending="deletePending"
      @confirm="confirmDelete"
    />

    <SubmitDialog v-model:open="submitOpen" :exercise-id="exerciseId" @submitted="onSubmitted" />
  </div>
</template>
