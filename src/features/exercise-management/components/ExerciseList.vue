<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SupervisorToolkit } from '@/features/toolkit-management/types'
import { useSupervisorToolkitsQuery } from '@/features/toolkit-management/api/queries'
import { formatDate } from '@/lib/datetime'

import { useExerciseMutations } from '../api/mutations'
import { useExercisesQuery } from '../api/queries'
import type { Exercise, ExerciseListQuery } from '../types'
import CreateExerciseDialog from './CreateExerciseDialog.vue'
import ExerciseListFilters from './ExerciseListFilters.vue'
import ExerciseListTable from './ExerciseListTable.vue'

type TabKey = 'Active' | 'Archived'
type OfficialScenarioFilter = 'All scenarios' | 'Assigned' | 'Not assigned'
type ProgressStatusFilter = 'All statuses' | 'In Progress' | 'Returned' | 'Under Review'

const route = useRoute()
const router = useRouter()
const { withdraw } = useExerciseMutations()
const activeTab = ref<TabKey>('Active')
const createOpen = ref(false)
const initialToolkitId = ref<string | undefined>()
const withdrawOpen = ref(false)
const withdrawTarget = ref<Exercise | null>(null)

const exerciseCodeFilter = ref('')
const appliedExerciseCode = ref('')
const pl3Filter = ref('All PL3')
const toolkitFilter = ref('All toolkits')
const createdFrom = ref('')
const createdTo = ref('')
const officialScenarioFilter = ref<OfficialScenarioFilter>('All scenarios')
const reviewStageFilter = ref('All stages')
const reviewerFilter = ref('All reviewers')
const statusFilter = ref<ProgressStatusFilter>('All statuses')
const submittedFrom = ref('')
const submittedTo = ref('')
const finalStatusFilter = ref('All statuses')
const archivedFrom = ref('')
const archivedTo = ref('')
const advancedOpen = ref<TabKey | null>(null)

const draftCreatedFrom = ref('')
const draftCreatedTo = ref('')
const draftOfficialScenario = ref<OfficialScenarioFilter>('All scenarios')
const draftReviewer = ref('All reviewers')
const draftSubmittedFrom = ref('')
const draftSubmittedTo = ref('')
const draftArchivedFrom = ref('')
const draftArchivedTo = ref('')
const page = ref(1)
const pageSize = ref(10)

const tabs: TabKey[] = ['Active', 'Archived']
const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const listQuery = computed<ExerciseListQuery>(() => {
  const inProgress = activeTab.value === 'Active'
  return {
    tab: inProgress ? 'IN_PROGRESS' : 'ARCHIVED',
    exerciseCode: appliedExerciseCode.value,
    toolkitName: toolkitFilter.value === 'All toolkits' ? undefined : toolkitFilter.value,
    pl3Name: pl3Filter.value === 'All PL3' ? undefined : pl3Filter.value,
    workflowStatus: inProgress
      ? statusFilter.value === 'Returned'
        ? 'RETURNED'
        : statusFilter.value === 'Under Review'
          ? 'UNDER_REVIEW'
          : statusFilter.value === 'In Progress'
            ? 'IN_PROGRESS'
            : undefined
      : finalStatusFilter.value === 'Approved'
        ? 'APPROVED'
        : finalStatusFilter.value === 'Rejected'
          ? 'REJECTED'
          : undefined,
    reviewStage:
      !inProgress || reviewStageFilter.value === 'All stages'
        ? undefined
        : reviewStageFilter.value === 'Manager Review'
          ? 'MANAGER'
          : reviewStageFilter.value === 'Center Delivery Head Review'
            ? 'CDH'
            : reviewStageFilter.value === 'Local Transformation Head Review'
              ? 'LTH'
              : undefined,
    handler:
      !inProgress || reviewerFilter.value === 'All reviewers'
        ? undefined
        : reviewerFilter.value,
    officialScenario:
      !inProgress || officialScenarioFilter.value === 'All scenarios'
        ? undefined
        : officialScenarioFilter.value === 'Assigned'
          ? 'ASSIGNED'
          : 'UNASSIGNED',
    createdFrom: inProgress ? createdFrom.value || undefined : undefined,
    createdTo: inProgress ? createdTo.value || undefined : undefined,
    submittedFrom: inProgress ? submittedFrom.value || undefined : undefined,
    submittedTo: inProgress ? submittedTo.value || undefined : undefined,
    archivedFrom: inProgress ? undefined : archivedFrom.value || undefined,
    archivedTo: inProgress ? undefined : archivedTo.value || undefined,
    page: page.value,
    pageSize: pageSize.value,
  }
})

const exercisesQuery = useExercisesQuery(listQuery)
const toolkitsQuery = useSupervisorToolkitsQuery({ page: 1, pageSize: 100 })
const exercises = computed(() => exercisesQuery.data.value?.items ?? [])
const total = computed(() => exercisesQuery.data.value?.total ?? 0)
const toolkits = computed<SupervisorToolkit[]>(() => toolkitsQuery.data.value?.items ?? [])
const toolkitNames = computed(() => exercisesQuery.data.value?.toolkitNames ?? [])
const pl3Names = computed(() => exercisesQuery.data.value?.pl3Names ?? [])
const reviewerNames = computed(() => exercisesQuery.data.value?.reviewerNames ?? [])
const loading = computed(
  () => exercisesQuery.isPending.value && !exercisesQuery.data.value,
)
const withdrawPending = computed(() => withdraw.isPending.value)

const pl3Options = computed(() => ['All PL3', ...pl3Names.value])
const toolkitOptions = computed(() => ['All toolkits', ...toolkitNames.value])
const reviewerOptions = computed(() => ['All reviewers', ...reviewerNames.value])

function resetPage() {
  page.value = 1
}

const advancedCount = computed(() => {
  if (activeTab.value === 'Active') {
    return (
      Number(Boolean(createdFrom.value || createdTo.value)) +
      Number(officialScenarioFilter.value !== 'All scenarios') +
      Number(reviewerFilter.value !== 'All reviewers') +
      Number(Boolean(submittedFrom.value || submittedTo.value))
    )
  }
  return Number(Boolean(archivedFrom.value || archivedTo.value))
})

const hasCurrentFilters = computed(() =>
  Boolean(
    exerciseCodeFilter.value ||
      pl3Filter.value !== 'All PL3' ||
      toolkitFilter.value !== 'All toolkits' ||
      advancedCount.value ||
      (activeTab.value === 'Active' && statusFilter.value !== 'All statuses') ||
      (activeTab.value === 'Active' && reviewStageFilter.value !== 'All stages') ||
      (activeTab.value === 'Archived' && finalStatusFilter.value !== 'All statuses'),
  ),
)

function switchTab(tab: TabKey) {
  activeTab.value = tab
  exerciseCodeFilter.value = ''
  appliedExerciseCode.value = ''
  advancedOpen.value = null
  resetPage()
}

function toggleAdvanced() {
  if (advancedOpen.value !== activeTab.value) {
    if (activeTab.value === 'Active') {
      draftCreatedFrom.value = createdFrom.value
      draftCreatedTo.value = createdTo.value
      draftOfficialScenario.value = officialScenarioFilter.value
      draftReviewer.value = reviewerFilter.value
      draftSubmittedFrom.value = submittedFrom.value
      draftSubmittedTo.value = submittedTo.value
    } else {
      draftArchivedFrom.value = archivedFrom.value
      draftArchivedTo.value = archivedTo.value
    }
    advancedOpen.value = activeTab.value
  } else {
    advancedOpen.value = null
  }
}

function clearAdvancedDrafts() {
  if (activeTab.value === 'Active') {
    draftCreatedFrom.value = ''
    draftCreatedTo.value = ''
    draftOfficialScenario.value = 'All scenarios'
    draftReviewer.value = 'All reviewers'
    draftSubmittedFrom.value = ''
    draftSubmittedTo.value = ''
  } else {
    draftArchivedFrom.value = ''
    draftArchivedTo.value = ''
  }
}

function applyAdvanced() {
  if (activeTab.value === 'Active') {
    createdFrom.value = draftCreatedFrom.value
    createdTo.value = draftCreatedTo.value
    officialScenarioFilter.value = draftOfficialScenario.value
    reviewerFilter.value = draftReviewer.value
    submittedFrom.value = draftSubmittedFrom.value
    submittedTo.value = draftSubmittedTo.value
  } else {
    archivedFrom.value = draftArchivedFrom.value
    archivedTo.value = draftArchivedTo.value
  }
  resetPage()
  advancedOpen.value = null
}

function clearCurrentFilters() {
  exerciseCodeFilter.value = ''
  appliedExerciseCode.value = ''
  pl3Filter.value = 'All PL3'
  toolkitFilter.value = 'All toolkits'
  if (activeTab.value === 'Active') {
    statusFilter.value = 'All statuses'
    createdFrom.value = ''
    createdTo.value = ''
    officialScenarioFilter.value = 'All scenarios'
    reviewStageFilter.value = 'All stages'
    reviewerFilter.value = 'All reviewers'
    submittedFrom.value = ''
    submittedTo.value = ''
  } else {
    finalStatusFilter.value = 'All statuses'
    archivedFrom.value = ''
    archivedTo.value = ''
  }
  resetPage()
  advancedOpen.value = null
}

function openCreate(toolkitId?: string) {
  initialToolkitId.value = toolkitId
  createOpen.value = true
}

function onCreated(exercise: Exercise) {
  activeTab.value = 'Active'
  if (route.query.create || route.query.toolkitId) {
    void router.replace({ name: 'supervisor-exercises' })
  }
  void router.push({ name: 'supervisor-exercise-detail', params: { id: exercise.id } })
}

function openExercise(exercise: Exercise) {
  // Editable exercises (including after Return / Withdraw) open the workbench.
  if (exercise.workflowStatus === 'IN_PROGRESS' || exercise.workflowStatus === 'RETURNED') {
    void router.push({ name: 'supervisor-exercise-detail', params: { id: exercise.id } })
    return
  }
  void router.push({ name: 'supervisor-submission', params: { id: exercise.id } })
}

function askWithdraw(exercise: Exercise) {
  withdrawTarget.value = exercise
  withdrawOpen.value = true
}

async function confirmWithdraw() {
  if (!withdrawTarget.value || withdrawPending.value) return
  try {
    await withdraw.mutateAsync(withdrawTarget.value.id)
    toast.success('Submission withdrawn.')
    withdrawOpen.value = false
    withdrawTarget.value = null
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not withdraw submission.')
  }
}

watch(
  () => [route.query.create, route.query.toolkitId] as const,
  ([create, toolkitId]) => {
    if (create === '1') {
      openCreate(typeof toolkitId === 'string' ? toolkitId : undefined)
    }
  },
  { immediate: true },
)

watch(
  [
    activeTab,
    pl3Filter,
    toolkitFilter,
    reviewStageFilter,
    statusFilter,
    finalStatusFilter,
    createdFrom,
    createdTo,
    officialScenarioFilter,
    reviewerFilter,
    submittedFrom,
    submittedTo,
    archivedFrom,
    archivedTo,
  ],
  () => {
    resetPage()
  },
)

watchDebounced(
  exerciseCodeFilter,
  (value) => {
    appliedExerciseCode.value = value
    resetPage()
  },
  { debounce: 400 },
)

watch(
  () => ({
    totalPages: exercisesQuery.data.value?.totalPages,
    fetching: exercisesQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

watch(
  () => exercisesQuery.isError.value,
  (isError) => {
    if (isError) {
      toast.error(
        exercisesQuery.error.value instanceof Error
          ? exercisesQuery.error.value.message
          : 'Could not load exercises.',
      )
    }
  },
)
</script>

<template>
  <div class="grid gap-4">
    <PageActions>
      <Button @click="openCreate()">Create New Exercise</Button>
    </PageActions>

    <Card>
      <CardHeader class="gap-3">
        <div class="flex gap-1 border-b">
          <button
            v-for="tab in tabs"
            :key="tab"
            type="button"
            class="border-b-2 px-3.5 py-2 text-sm transition-colors"
            :class="
              activeTab === tab
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            "
            @click="switchTab(tab)"
          >
            {{ tab }}
          </button>
        </div>
        <div class="flex items-center justify-between gap-2">
          <CardTitle class="text-base">Exercises</CardTitle>
          <button
            v-if="hasCurrentFilters"
            type="button"
            class="text-sm font-semibold text-primary"
            @click="clearCurrentFilters"
          >
            Clear All
          </button>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        <ExerciseListFilters
          :active-tab="activeTab"
          :select-class="selectClass"
          :exercise-code-filter="exerciseCodeFilter"
          :pl3-filter="pl3Filter"
          :toolkit-filter="toolkitFilter"
          :status-filter="statusFilter"
          :review-stage-filter="reviewStageFilter"
          :final-status-filter="finalStatusFilter"
          :advanced-open="advancedOpen"
          :advanced-count="advancedCount"
          :pl3-options="pl3Options"
          :toolkit-options="toolkitOptions"
          :reviewer-options="reviewerOptions"
          :draft-created-from="draftCreatedFrom"
          :draft-created-to="draftCreatedTo"
          :draft-official-scenario="draftOfficialScenario"
          :draft-reviewer="draftReviewer"
          :draft-submitted-from="draftSubmittedFrom"
          :draft-submitted-to="draftSubmittedTo"
          :draft-archived-from="draftArchivedFrom"
          :draft-archived-to="draftArchivedTo"
          @update:exercise-code-filter="exerciseCodeFilter = $event"
          @update:pl3-filter="pl3Filter = $event"
          @update:toolkit-filter="toolkitFilter = $event"
          @update:status-filter="statusFilter = $event"
          @update:review-stage-filter="reviewStageFilter = $event"
          @update:final-status-filter="finalStatusFilter = $event"
          @update:draft-created-from="draftCreatedFrom = $event"
          @update:draft-created-to="draftCreatedTo = $event"
          @update:draft-official-scenario="draftOfficialScenario = $event"
          @update:draft-reviewer="draftReviewer = $event"
          @update:draft-submitted-from="draftSubmittedFrom = $event"
          @update:draft-submitted-to="draftSubmittedTo = $event"
          @update:draft-archived-from="draftArchivedFrom = $event"
          @update:draft-archived-to="draftArchivedTo = $event"
          @toggle-advanced="toggleAdvanced"
          @clear-advanced-drafts="clearAdvancedDrafts"
          @apply-advanced="applyAdvanced"
        />

        <ExerciseListTable
          :active-tab="activeTab"
          :rows="exercises"
          :loading="loading"
          @open="openExercise"
          @withdraw="askWithdraw"
        />

        <TablePager
          :total="total"
          :page="page"
          :page-size="pageSize"
          label="exercises"
          @update:page="page = $event"
          @update:page-size="
            (size) => {
              pageSize = size
              page = 1
            }
          "
        />
      </CardContent>
    </Card>

    <CreateExerciseDialog
      v-model:open="createOpen"
      :toolkits="toolkits"
      :initial-toolkit-id="initialToolkitId"
      @created="onCreated"
    />

    <ConfirmDialog
      v-model:open="withdrawOpen"
      title="Withdraw Submission"
      description="Withdraw this Under Review submission and reopen the exercise for editing."
      confirm-label="Withdraw"
      :rows="
        withdrawTarget
          ? [
              { label: 'Exercise', value: withdrawTarget.exerciseCode, strong: true },
              { label: 'Toolkit', value: withdrawTarget.snapshot.toolkit.name },
              { label: 'Submitted', value: formatDate(withdrawTarget.submittedAt) },
            ]
          : []
      "
      :pending="withdrawPending"
      @confirm="confirmWithdraw"
    />
  </div>
</template>
