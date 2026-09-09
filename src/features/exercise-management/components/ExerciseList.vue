<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageActions from '@/components/PageActions.vue'
import TabStrip from '@/components/TabStrip.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { SupervisorToolkit } from '@/features/toolkit-management/types'
import { useManagedToolkitsQuery } from '@/features/toolkit-management/api/queries'
import { formatDate } from '@/lib/datetime'

import { useExerciseMutations } from '../api/mutations'
import { useExercisesQuery } from '../api/queries'
import type { Exercise, ExerciseListQuery } from '../types'
import { IN_PROGRESS_TAB, reviewStageQueryValue } from '../workflowLabels'
import CreateExerciseDialog from './CreateExerciseDialog.vue'
import ExerciseListFilters from './ExerciseListFilters.vue'
import {
  emptyExerciseListFilters,
  type ExerciseListFilterValues,
} from './exerciseListFilters'
import ExerciseListTable from './ExerciseListTable.vue'

type TabKey = typeof IN_PROGRESS_TAB | 'Archived'

const route = useRoute()
const router = useRouter()
const { withdraw } = useExerciseMutations()

function tabFromQuery(value: unknown): TabKey {
  return value === 'ARCHIVED' ? 'Archived' : IN_PROGRESS_TAB
}

const activeTab = ref<TabKey>(tabFromQuery(route.query.tab))
const createOpen = ref(false)
const withdrawOpen = ref(false)
const withdrawTarget = ref<Exercise | null>(null)

const applied = reactive(emptyExerciseListFilters())
const page = ref(1)
const pageSize = ref(10)

const tabs: TabKey[] = [IN_PROGRESS_TAB, 'Archived']

const listQuery = computed<ExerciseListQuery>(() => {
  const inProgress = activeTab.value === IN_PROGRESS_TAB
  return {
    tab: inProgress ? 'IN_PROGRESS' : 'ARCHIVED',
    exerciseCode: applied.exerciseCode,
    toolkitName: applied.toolkit === 'All toolkits' ? undefined : applied.toolkit,
    pl3Name: applied.pl3 || undefined,
    workflowStatus: inProgress
      ? undefined
      : applied.finalStatus === 'Approved'
        ? 'APPROVED'
        : undefined,
    reviewStage: inProgress ? reviewStageQueryValue(applied.reviewStage) : undefined,
    handler:
      !inProgress || applied.reviewer === 'All reviewers' ? undefined : applied.reviewer,
    officialScenario:
      !inProgress || applied.officialScenario === 'All scenarios'
        ? undefined
        : applied.officialScenario === 'Assigned'
          ? 'ASSIGNED'
          : 'UNASSIGNED',
    createdFrom: inProgress ? applied.createdFrom || undefined : undefined,
    createdTo: inProgress ? applied.createdTo || undefined : undefined,
    submittedFrom: inProgress ? applied.submittedFrom || undefined : undefined,
    submittedTo: inProgress ? applied.submittedTo || undefined : undefined,
    archivedFrom: inProgress ? undefined : applied.archivedFrom || undefined,
    archivedTo: inProgress ? undefined : applied.archivedTo || undefined,
    page: page.value,
    pageSize: pageSize.value,
  }
})

const exercisesQuery = useExercisesQuery(listQuery)
const toolkitsQuery = useManagedToolkitsQuery({ page: 1, pageSize: 100 })
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

const pl3Options = computed(() => pl3Names.value)
const toolkitOptions = computed(() => ['All toolkits', ...toolkitNames.value])
const reviewerOptions = computed(() => ['All reviewers', ...reviewerNames.value])

function resetPage() {
  page.value = 1
}

function persistTab(tab: TabKey) {
  const next = tab === 'Archived' ? 'ARCHIVED' : 'IN_PROGRESS'
  if (route.query.tab === next) return
  void router.replace({
    name: 'supervisor-exercises',
    query: { ...route.query, tab: next },
  })
}

function switchTab(tab: TabKey) {
  if (tab === activeTab.value) {
    persistTab(tab)
    return
  }
  activeTab.value = tab
  Object.assign(applied, emptyExerciseListFilters())
  resetPage()
  persistTab(tab)
}

function applySearch(values: ExerciseListFilterValues) {
  Object.assign(applied, values)
  resetPage()
}

function clearFilters() {
  Object.assign(applied, emptyExerciseListFilters())
  resetPage()
}

function openCreate() {
  createOpen.value = true
}

function onCreated(exercise: Exercise) {
  activeTab.value = IN_PROGRESS_TAB
  void router.push({ name: 'supervisor-exercise-detail', params: { id: exercise.id } })
}

function openExercise(exercise: Exercise) {
  // Editable exercises (including after Return / Withdraw) open the workbench.
  if (exercise.workflowStatus === 'IN_PROGRESS') {
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
  () => route.query.tab,
  (value) => {
    const next = tabFromQuery(value)
    if (next === activeTab.value) return
    activeTab.value = next
    Object.assign(applied, emptyExerciseListFilters())
    resetPage()
  },
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
  <div class="grid min-w-0 gap-4">
    <PageActions>
      <Button @click="openCreate()">Create New Exercise</Button>
    </PageActions>

    <Card>
      <CardHeader>
        <TabStrip
          :tabs="tabs.map((tab) => ({ key: tab, label: tab }))"
          :model-value="activeTab"
          @update:model-value="switchTab"
        />
      </CardHeader>
      <CardContent class="space-y-3">
        <ExerciseListFilters
          :key="activeTab"
          :active-tab="activeTab"
          :pl3-options="pl3Options"
          :toolkit-options="toolkitOptions"
          :reviewer-options="reviewerOptions"
          @search="applySearch"
          @clear="clearFilters"
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
      @created="onCreated"
    />

    <ConfirmDialog
      v-model:open="withdrawOpen"
      title="Withdraw Submission"
      description="Withdraw this submission and return the exercise to Supervisor Sizing."
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
