<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import TabStrip from '@/components/TabStrip.vue'
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
import { capacityTone, measuredRightSizingHc } from '@/lib/hcFormat'

import { FieldUnit, withUnit } from '../fieldUnits'
import { exerciseListBackLabel, exerciseListLocation } from '../workflowLabels'
import { pickScenario, remainingScenarios } from '../scenarioSelection'
import type { Scenario } from '../types'
import { actualHeadcount } from '../sizingChartMath'
import { provideExerciseWorkspace } from '../composables/useExerciseWorkspace'
import { sumSupportFte } from './associated-data/supportOptions'
import AssociatedDataPanel from './AssociatedDataPanel.vue'
import EditExercisePeriodsDialog from './EditExercisePeriodsDialog.vue'
import ExerciseDetailHeader from './ExerciseDetailHeader.vue'
import ScenarioForm from './ScenarioForm.vue'
import ScenarioIdentityDialog from './ScenarioIdentityDialog.vue'
import SubmitDialog from './SubmitDialog.vue'

const props = defineProps<{
  exerciseId: string
}>()

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const exerciseWorkspace = provideExerciseWorkspace()
const { remove } = useExerciseMutations()
const { createScenario: createScenarioMutation, markOfficial, deleteScenario } =
  useScenarioMutations()

const snapshotMode = computed(
  () =>
    route.name === 'supervisor-exercise-snapshot' ||
    route.name === 'supervisor-scenario-snapshot',
)
const exerciseIdRef = computed(() => props.exerciseId)

const exerciseQuery = useExerciseQuery(exerciseIdRef)
const scenariosQuery = useExerciseScenariosQuery(exerciseIdRef)
const teamSetupQuery = useTeamSetupQuery(exerciseIdRef)
const supportQuery = useSupportQuery(exerciseIdRef)
const cycleTimeQuery = useCycleTimeActiveQuery(exerciseIdRef)

const exercise = computed(() => exerciseQuery.data.value ?? null)
const scenarios = computed(() =>
  remainingScenarios(scenariosQuery.data.value ?? [], removingScenarioId.value),
)
const teamSetup = computed(() => teamSetupQuery.data.value ?? null)
const support = computed(() => supportQuery.data.value ?? [])
const cycleTime = computed(() => cycleTimeQuery.data.value ?? null)

const loading = computed(
  () =>
    (exerciseQuery.isPending.value && !exerciseQuery.data.value) ||
    (scenariosQuery.isPending.value && !scenariosQuery.data.value),
)

const selectedId = ref<string | null>(null)
const mountedScenarioIds = ref<string[]>([])
const removingScenarioId = ref<string | null>(null)
const deleteOpen = ref(false)
const removeScenarioOpen = ref(false)
const newScenarioOpen = ref(false)
const officialOpen = ref(false)
const submitOpen = ref(false)
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
const historyLoading = computed(
  () => hasApprovalHistory.value && submittedQuery.isPending.value && !submittedQuery.data.value,
)

const deletePending = computed(() => remove.isPending.value)
const removeScenarioPending = computed(() => deleteScenario.isPending.value)
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
const routeScenarioId = computed(() => {
  const id = route.params.scenarioId
  return typeof id === 'string' && id ? id : null
})
const activeScenarioId = computed(() => routeScenarioId.value ?? selectedId.value)
const selectedScenario = computed(
  () => scenarios.value.find((item) => item.id === activeScenarioId.value) ?? null,
)
const isActiveOfficial = computed(
  () => Boolean(activeScenarioId.value) && exercise.value?.officialScenarioId === activeScenarioId.value,
)
function scenarioDisplayName(item: { name?: string | null; scenarioCode?: string | null }) {
  return item.name?.trim() || item.scenarioCode || 'Scenario'
}

const scenarioTabs = computed(() =>
  scenarios.value.map((item) => ({
    key: item.id,
    label: scenarioDisplayName(item),
    badge: exercise.value?.officialScenarioId === item.id ? 'Official' : undefined,
  })),
)

function rememberScenario(id: string | null) {
  if (!id || mountedScenarioIds.value.includes(id)) return
  mountedScenarioIds.value = [...mountedScenarioIds.value, id]
}

function scenarioRoute(scenarioId: string) {
  return {
    name: snapshotMode.value ? 'supervisor-scenario-snapshot' : 'supervisor-scenario-form',
    params: { id: props.exerciseId, scenarioId },
  }
}

function exerciseRoute() {
  return {
    name: snapshotMode.value ? 'supervisor-exercise-snapshot' : 'supervisor-exercise-detail',
    params: { id: props.exerciseId },
  }
}

function selectScenario(id: string) {
  selectedId.value = id
  rememberScenario(id)
  if (id === routeScenarioId.value) return
  void router.push(scenarioRoute(id))
}

function showRemainingScenario(next: Scenario | undefined) {
  if (next) {
    selectedId.value = next.id
    rememberScenario(next.id)
    if (next.id !== routeScenarioId.value) void router.replace(scenarioRoute(next.id))
    return
  }
  selectedId.value = null
  if (routeScenarioId.value) void router.replace(exerciseRoute())
}

async function confirmRemoveScenario() {
  if (!activeScenarioId.value) return
  const removedId = activeScenarioId.value
  const next = pickScenario(
    remainingScenarios(scenarios.value, removedId),
    exercise.value?.officialScenarioId === removedId
      ? null
      : exercise.value?.officialScenarioId,
  )
  removingScenarioId.value = removedId
  mountedScenarioIds.value = mountedScenarioIds.value.filter((id) => id !== removedId)
  showRemainingScenario(next)
  try {
    await deleteScenario.mutateAsync({
      exerciseId: props.exerciseId,
      scenarioId: removedId,
    })
    exerciseWorkspace.dropDraft(removedId)
    toast.success('Scenario removed.')
    removeScenarioOpen.value = false
  } catch (error) {
    rememberScenario(removedId)
    selectedId.value = removedId
    void router.replace(scenarioRoute(removedId))
    toast.error(error instanceof Error ? error.message : 'Could not remove scenario.')
    removeScenarioOpen.value = false
  } finally {
    removingScenarioId.value = null
  }
}

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
  exerciseWorkspace.notifyAssociatedDataChanged()
}

async function confirmDelete() {
  try {
    const id = props.exerciseId
    await remove.mutateAsync(id)
    deleteOpen.value = false
    await router.replace(exerciseListLocation(exercise.value?.workflowStatus))
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

async function createScenario(identity: { name: string; description: string | null }) {
  if (!exercise.value) return
  try {
    const created = await createScenarioMutation.mutateAsync({
      exerciseId: props.exerciseId,
      body: {
        scenarioCode: nextScenarioCode.value,
        name: identity.name,
        description: identity.description,
        rightSizingHc: null,
      },
    })
    newScenarioOpen.value = false
    toast.success(`${created.name} created.`)
    void router.push({
      name: 'supervisor-scenario-form',
      params: { id: props.exerciseId, scenarioId: created.id },
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not create scenario.')
  }
}

function openOfficialDialog() {
  if (!activeScenarioId.value) {
    toast.warning('Please select a scenario first.')
    return
  }
  officialOpen.value = true
}

async function confirmOfficial() {
  if (!activeScenarioId.value) return
  try {
    await markOfficial.mutateAsync({
      exerciseId: props.exerciseId,
      scenarioId: activeScenarioId.value,
    })
    toast.success('Set as the official scenario.')
    officialOpen.value = false
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not mark official.')
  }
}

async function requestSubmit() {
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
    if (id && !routeScenarioId.value && scenarios.value.some((item) => item.id === id)) {
      selectedId.value = id
    }
  },
  { immediate: true },
)

const scenariosLoaded = computed(() => scenariosQuery.data.value !== undefined)

watch(
  [scenarios, routeScenarioId, () => route.name, pageTab, scenariosLoaded],
  () => {
    if (!scenariosLoaded.value) return
    const liveIds = new Set(scenarios.value.map((item) => item.id))
    mountedScenarioIds.value = mountedScenarioIds.value.filter((id) => liveIds.has(id))
    if (selectedId.value && !liveIds.has(selectedId.value)) selectedId.value = null

    if (routeScenarioId.value && !liveIds.has(routeScenarioId.value)) {
      showRemainingScenario(pickScenario(scenarios.value, exercise.value?.officialScenarioId))
      return
    }
    if (routeScenarioId.value) {
      selectedId.value = routeScenarioId.value
      rememberScenario(routeScenarioId.value)
      return
    }
    if (pageTab.value === 'approval') return
    if (
      route.name !== 'supervisor-exercise-detail' &&
      route.name !== 'supervisor-exercise-snapshot'
    ) {
      return
    }
    const pick = pickScenario(scenarios.value, exercise.value?.officialScenarioId)
    if (!pick) return
    selectedId.value = pick.id
    rememberScenario(pick.id)
    void router.replace(scenarioRoute(pick.id))
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
    void router.push(exerciseListLocation(exercise.value?.workflowStatus))
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
              : router.push(exerciseListLocation(exercise.workflowStatus))
          "
        >
          {{
            snapshotMode
              ? '← Back to Submitted Exercise Details'
              : exerciseListBackLabel(exercise.workflowStatus)
          }}
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

    <TabStrip
      v-if="showApprovalTab"
      :tabs="[
        { key: 'exercise', label: 'Exercise' },
        { key: 'approval', label: 'Approval' },
      ]"
      :model-value="pageTab"
      @update:model-value="pageTab = $event"
    />

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
      />

      <EditExercisePeriodsDialog
        v-if="exercise"
        v-model:open="periodsEditOpen"
        :exercise="exercise"
        @saved="onPeriodsSaved"
      />

      <AssociatedDataPanel
        :key="`${exercise.id}-${exercise.sizingMonth}`"
        :exercise-id="exerciseId"
        :sizing-month="exercise.sizingMonth"
        :slot-start-date="exercise.slotStartDate"
        :slot-weeks="exercise.slotWeeks"
        :tms-from="exercise.tmsFrom"
        :tms-to="exercise.tmsTo"
        :read-only="locked"
      />

      <div class="grid gap-3">
        <div class="flex items-end gap-2 border-b">
          <TabStrip
            v-if="scenarioTabs.length"
            class="min-w-0 flex-1 border-b-0"
            :tabs="scenarioTabs"
            :model-value="activeScenarioId ?? scenarioTabs[0]?.key"
            @update:model-value="selectScenario"
          />
          <div v-else class="min-h-9 min-w-0 flex-1" />
          <div v-if="!locked" class="mb-1.5 flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button variant="outline" @click="newScenarioOpen = true">
              New Scenario
            </Button>
            <Button
              v-if="activeScenarioId && !isActiveOfficial"
              variant="outline"
              @click="openOfficialDialog"
            >
              Set as Official
            </Button>
            <Button
              v-if="activeScenarioId"
              variant="destructive"
              @click="removeScenarioOpen = true"
            >
              Remove
            </Button>
          </div>
        </div>

        <p
          v-if="!scenarios.length"
          class="rounded-lg border border-dashed px-3 py-10 text-center text-sm text-muted-foreground"
        >
          No scenarios yet. Create one to start simulation.
        </p>

        <ScenarioForm
          v-for="id in mountedScenarioIds"
          v-show="id === activeScenarioId"
          :key="id"
          embedded
          :exercise-id="exerciseId"
          :scenario-id="id"
        />
      </div>
    </div>

    <div v-if="showApprovalTab && pageTab === 'approval'">
      <ApprovalCompletedPanel
        :workspace="workspace"
        :pending="historyLoading"
        :empty-message="historyError ? 'Approval history is unavailable.' : 'No approval history yet.'"
        :center="exercise?.snapshot.toolkit.center"
      />
    </div>

    <ScenarioIdentityDialog
      v-model:open="newScenarioOpen"
      title="Create New Scenario"
      subtitle="Name the scenario. Description is optional."
      :pending="createPending"
      confirm-label="Confirm"
      pending-label="Creating…"
      @submit="createScenario"
    />

    <Dialog v-model:open="officialOpen">
      <DialogContent
        class="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
          <DialogTitle>Set Official Scenario</DialogTitle>
          <DialogDescription>
            This only sets the Official flag on the selected scenario. It does not create a
            new scenario. Run Sizing Simulation first. Slot Simulation is optional. You
            can switch Official any time before Submit.
          </DialogDescription>
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div v-if="selectedScenario" class="rounded-lg border bg-card p-4">
            <DetailTable
              :rows="[
                { label: 'Scenario', value: selectedScenario.name },
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
                  key: 'capacityCreation',
                  label: withUnit('Capacity Creation', FieldUnit.hc),
                  value: formatSigned(capacityCreation(selectedScenario)),
                },
              ]"
            >
              <template #capacityCreation="{ row }">
                <span :class="capacityTone(capacityCreation(selectedScenario)) || 'font-semibold'">
                  {{ row.value || '—' }}
                </span>
              </template>
            </DetailTable>
          </div>
        </div>
        <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
          <Button variant="outline" :disabled="officialPending" @click="officialOpen = false">
            Cancel
          </Button>
          <Button :loading="officialPending" @click="confirmOfficial">
            {{ officialPending ? 'Setting…' : 'Set as Official' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      v-model:open="removeScenarioOpen"
      title="Remove Scenario"
      description="This scenario will be removed from the exercise. This cannot be undone."
      confirm-label="Remove"
      :pending="removeScenarioPending"
      @confirm="confirmRemoveScenario"
    />

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete Exercise"
      warning="This action cannot be undone. The exercise, its scenarios, and any open approval process will be closed."
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
