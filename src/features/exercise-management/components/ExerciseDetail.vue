<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import TimesheetAlignmentAlert from '@/features/timesheet-alignment/components/TimesheetAlignmentAlert.vue'
import ApprovalCompletedPanel from '@/features/approval/components/ApprovalCompletedPanel.vue'
import { historyFromActions } from '@/features/approval/historyFromActions'

import { useExerciseMutations, useScenarioMutations } from '../api/mutations'
import {
  useCycleTimeActiveQuery,
  useExerciseQuery,
  useExerciseScenariosQuery,
  useSubmittedDetailsQuery,
  useSupportQuery,
  useTeamSetupQuery,
} from '../api/queries'
import { measuredRightSizingHc } from '@/lib/hcFormat'

import { FieldUnit, withUnit } from '../fieldUnits'
import type { Scenario } from '../types'
import { actualHeadcount } from '../sizingChartMath'
import { sumSupportFte } from './associated-data/supportOptions'
import AssociatedDataPanel from './AssociatedDataPanel.vue'
import EditExercisePeriodsDialog from './EditExercisePeriodsDialog.vue'
import ExerciseDetailHeader from './ExerciseDetailHeader.vue'
import ExerciseScenarioList from './ExerciseScenarioList.vue'
import SubmitDialog from './SubmitDialog.vue'
import ToolkitInfoDialog from './ToolkitInfoDialog.vue'

const props = defineProps<{
  exerciseId: string
}>()

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const { remove } = useExerciseMutations()
const { createScenario: createScenarioMutation, markOfficial } = useScenarioMutations()

const snapshotMode = computed(() => route.name === 'supervisor-exercise-snapshot')
const exerciseIdRef = computed(() => props.exerciseId)

const exerciseQuery = useExerciseQuery(exerciseIdRef)
const scenariosQuery = useExerciseScenariosQuery(exerciseIdRef)
const teamSetupQuery = useTeamSetupQuery(exerciseIdRef)
const supportQuery = useSupportQuery(exerciseIdRef)
const cycleTimeQuery = useCycleTimeActiveQuery(exerciseIdRef)

const exercise = computed(() => exerciseQuery.data.value ?? null)
const scenarios = computed(() => scenariosQuery.data.value ?? [])
const teamSetup = computed(() => teamSetupQuery.data.value ?? null)
const support = computed(() => supportQuery.data.value ?? [])
const cycleTime = computed(() => cycleTimeQuery.data.value ?? null)

const loading = computed(
  () =>
    (exerciseQuery.isPending.value && !exerciseQuery.data.value) ||
    (scenariosQuery.isPending.value && !scenariosQuery.data.value),
)

const selectedId = ref<string | null>(null)
const deleteOpen = ref(false)
const newScenarioOpen = ref(false)
const officialOpen = ref(false)
const submitOpen = ref(false)
const toolkitInfoOpen = ref(false)
const periodsEditOpen = ref(false)
const pageTab = ref<'exercise' | 'approval'>('exercise')

const hasApprovalHistory = computed(
  () =>
    Boolean(exercise.value?.submittedAt) || exercise.value?.submissionStatus === 'RETURNED',
)
const submittedQuery = useSubmittedDetailsQuery(exerciseIdRef, hasApprovalHistory)
const submitted = computed(() => submittedQuery.data.value ?? null)
const historyError = computed(
  () => hasApprovalHistory.value && submittedQuery.isError.value,
)

const deletePending = computed(() => remove.isPending.value)
const createPending = computed(() => createScenarioMutation.isPending.value)
const officialPending = computed(() => markOfficial.isPending.value)

const workspace = computed(() => {
  const raw = submitted.value?.workspace
  if (!raw) return null
  if (raw.history?.length) return raw
  return {
    ...raw,
    history: historyFromActions(submitted.value?.actions ?? []),
  }
})
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
const actualSize = computed(() =>
  actualHeadcount(teamSetup.value?.totalAgents, deliveryHc.value),
)
const supportFte = computed(() => sumSupportFte(support.value))
const medianLabel = computed(() =>
  cycleTime.value ? Number(cycleTime.value.medianSeconds).toFixed(2) : '—',
)
const slaTargetLabel = computed(() => {
  const ratio = teamSetup.value?.slaTargetRatio
  if (ratio == null) return '—'
  return (Number(ratio) * 100).toFixed(2)
})
const shiftSetupLabel = computed(() => {
  const n = selectedScenario.value?.shifts?.length ?? 0
  if (n <= 0) return '—'
  return String(n)
})

function assumptionHc(scenario: Scenario) {
  return measuredRightSizingHc(scenario.rightSizingHc)
}

function capacityCreation(scenario: Scenario) {
  const rs = assumptionHc(scenario)
  if (rs == null || supportFte.value == null) return null
  return actualSize.value - rs - supportFte.value
}

function formatSigned(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function onPeriodsSaved() {
  // Cache updated via updatePeriods mutation; list/detail queries invalidate.
}

async function confirmDelete() {
  try {
    const id = props.exerciseId
    await remove.mutateAsync(id)
    deleteOpen.value = false
    await router.replace({ name: 'supervisor-exercises' })
    // Drop caches after leaving the detail page so observers are gone.
    queryClient.removeQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === 'exercises' &&
        query.queryKey.includes(id),
    })
    toast.success('Exercise deleted.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Delete failed.')
    deleteOpen.value = false
  }
}

async function createScenario() {
  if (!exercise.value) return
  try {
    const created = await createScenarioMutation.mutateAsync({
      exerciseId: props.exerciseId,
      body: {
        scenarioCode: nextScenarioCode.value,
        name: `${exercise.value.snapshot.toolkit.name} ${nextScenarioCode.value}`,
        description: null,
        rightSizingHc: null,
      },
    })
    newScenarioOpen.value = false
    toast.success(`${created.scenarioCode} created.`)
    void router.push({
      name: 'supervisor-scenario-form',
      params: { id: props.exerciseId, scenarioId: created.id },
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not create scenario.')
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
  try {
    await markOfficial.mutateAsync({
      exerciseId: props.exerciseId,
      scenarioId: selectedId.value,
    })
    toast.success('Saved as the official scenario.')
    officialOpen.value = false
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not mark official.')
  }
}

function requestSubmit() {
  if (!exercise.value?.officialScenarioId) {
    toast.warning('An Official Scenario is required before Submit.')
    return
  }
  submitOpen.value = true
}

function onSubmitted() {
  void router.push({ name: 'supervisor-submission', params: { id: props.exerciseId } })
}

watch(
  () => exercise.value?.officialScenarioId,
  (id) => {
    if (id) selectedId.value = id
  },
  { immediate: true },
)

watch(
  () => exerciseQuery.isError.value,
  (isError) => {
    if (!isError) return
    toast.error(
      exerciseQuery.error.value instanceof Error
        ? exerciseQuery.error.value.message
        : 'Could not load exercise.',
    )
    void router.push({ name: 'supervisor-exercises' })
  },
)
</script>

<template>
  <ListLoading v-if="loading" class="h-48" />
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
      <Button
        v-if="!snapshotMode && exercise.canEdit && pageTab === 'exercise'"
        @click="requestSubmit"
      >
        Submit For Validation
      </Button>
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
      <TimesheetAlignmentAlert
        audience="exercise"
        :alignment="exercise.timesheetAlignment"
        :frozen-delivery-hc="exercise.deliveryHc ?? deliveryHc"
        :frozen-sync-date="exercise.snapshot.timesheetSyncDate"
      />

      <ExerciseDetailHeader
        :exercise="exercise"
        :locked="locked"
        @edit-periods="periodsEditOpen = true"
        @toolkit-info="toolkitInfoOpen = true"
      />

      <EditExercisePeriodsDialog
        v-if="exercise"
        v-model:open="periodsEditOpen"
        :exercise="exercise"
        @saved="onPeriodsSaved"
      />

      <ToolkitInfoDialog
        v-model:open="toolkitInfoOpen"
        :snapshot="exercise.snapshot"
        :alignment="exercise.timesheetAlignment"
      />

      <AssociatedDataPanel
        :key="`${exercise.id}-${exercise.sizingMonth}-${exercise.tmsFrom}-${exercise.tmsTo}`"
        :exercise-id="exerciseId"
        :sizing-month="exercise.sizingMonth"
        :slot-start-date="exercise.slotStartDate"
        :slot-weeks="exercise.slotWeeks"
        :read-only="locked"
      />

      <ExerciseScenarioList
        :exercise-id="exerciseId"
        :scenarios="scenarios"
        :selected-id="selectedId"
        :official-scenario-id="exercise.officialScenarioId"
        :locked="locked"
        :snapshot-mode="snapshotMode"
        :actual-size="actualSize"
        :sla-target-label="slaTargetLabel"
        :median-label="medianLabel"
        :assumption-hc="assumptionHc"
        :capacity-creation="capacityCreation"
        :format-signed="formatSigned"
        @update:selected-id="selectedId = $event"
        @open-official="openOfficialDialog"
        @new-scenario="newScenarioOpen = true"
      />
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
            A new scenario will be created with the following identity. You can set Right Sizing HC
            and run simulation on the next page.
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
            This only sets the Official flag on the selected scenario. It does not create a
            new scenario. You can switch Official any time before Submit.
          </DialogDescription>
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div v-if="selectedScenario" class="rounded-lg border bg-card p-4">
            <DetailTable
              :rows="[
                { label: 'Scenario', value: selectedScenario.scenarioCode },
                { label: withUnit('Actual size', FieldUnit.hc), value: actualSize.toFixed(2) },
                { label: withUnit('SLA Target', FieldUnit.percent), value: slaTargetLabel },
                { label: withUnit('Shift Setup', FieldUnit.shifts), value: shiftSetupLabel },
                { label: withUnit('Median Cycle Time', FieldUnit.seconds), value: medianLabel },
                {
                  label: withUnit('Right size', FieldUnit.hc),
                  value:
                    assumptionHc(selectedScenario) != null
                      ? assumptionHc(selectedScenario)!.toFixed(2)
                      : '—',
                },
                {
                  label: withUnit('Production support', FieldUnit.fte),
                  value: supportFte != null ? supportFte.toFixed(2) : '—',
                },
                {
                  label: withUnit('Capacity Creation', FieldUnit.hc),
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

    <SubmitDialog
      v-model:open="submitOpen"
      :exercise-id="exerciseId"
      :frozen-delivery-hc="exercise?.deliveryHc ?? deliveryHc"
      :frozen-sync-date="exercise?.snapshot.timesheetSyncDate"
      @submitted="onSubmitted"
    />
  </div>
</template>
