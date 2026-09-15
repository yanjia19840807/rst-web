<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import PageActions from '@/components/PageActions.vue'
import TabStrip from '@/components/TabStrip.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { SupervisorToolkit } from '@/features/toolkit-management/types'
import { useManagedToolkitsQuery } from '@/features/toolkit-management/api/queries'

import { useExercisesQuery } from '../api/queries'
import type { Exercise, ExerciseListQuery } from '../types'
import { IN_PROGRESS_TAB, VALIDATED_TAB, reviewStageQueryValue } from '../workflowLabels'
import CreateExerciseDialog from './CreateExerciseDialog.vue'
import ExerciseListFilters from './ExerciseListFilters.vue'
import ToolkitInfoDialog from './ToolkitInfoDialog.vue'
import {
  emptyExerciseListFilters,
  type ExerciseListFilterValues,
} from './exerciseListFilters'
import ExerciseListTable from './ExerciseListTable.vue'

type TabKey = typeof IN_PROGRESS_TAB | typeof VALIDATED_TAB

const route = useRoute()
const router = useRouter()

function tabFromQuery(value: unknown): TabKey {
  return value === 'VALIDATED' || value === 'ARCHIVED' ? VALIDATED_TAB : IN_PROGRESS_TAB
}

const activeTab = ref<TabKey>(tabFromQuery(route.query.tab))
const createOpen = ref(false)
const toolkitInfoOpen = ref(false)
const toolkitExercise = ref<Exercise | null>(null)

const applied = reactive(emptyExerciseListFilters())
const page = ref(1)
const pageSize = ref(10)

const tabs: TabKey[] = [IN_PROGRESS_TAB, VALIDATED_TAB]

const listQuery = computed<ExerciseListQuery>(() => {
  const inProgress = activeTab.value === IN_PROGRESS_TAB
  return {
    tab: inProgress ? 'IN_PROGRESS' : 'VALIDATED',
    exerciseCode: applied.exerciseCode,
    toolkitName: applied.toolkit === 'All toolkits' ? undefined : applied.toolkit,
    pl3Name: applied.pl3 || undefined,
    sizingMonth: applied.sizingMonth || undefined,
    reviewStage: inProgress ? reviewStageQueryValue(applied.reviewStage) : undefined,
    handler: !inProgress || !applied.reviewer ? undefined : applied.reviewer,
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
const loading = computed(
  () => exercisesQuery.isPending.value && !exercisesQuery.data.value,
)

const pl3Options = computed(() => pl3Names.value)
const toolkitOptions = computed(() => ['All toolkits', ...toolkitNames.value])

function resetPage() {
  page.value = 1
}

function persistTab(tab: TabKey) {
  const next = tab === VALIDATED_TAB ? 'VALIDATED' : 'IN_PROGRESS'
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

function openToolkitInfo(exercise: Exercise) {
  toolkitExercise.value = exercise
  toolkitInfoOpen.value = true
}

function openExercise(exercise: Exercise) {
  // Editable exercises (including after Return) open the workbench.
  if (exercise.workflowStatus === 'IN_PROGRESS') {
    void router.push({ name: 'supervisor-exercise-detail', params: { id: exercise.id } })
    return
  }
  void router.push({ name: 'supervisor-submission', params: { id: exercise.id } })
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
          @search="applySearch"
          @clear="clearFilters"
        />

        <ExerciseListTable
          :active-tab="activeTab"
          :rows="exercises"
          :loading="loading"
          @open="openExercise"
          @toolkit-info="openToolkitInfo"
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

    <ToolkitInfoDialog
      v-model:open="toolkitInfoOpen"
      :snapshot="toolkitExercise?.snapshot ?? null"
      :alignment="toolkitExercise?.timesheetAlignment"
    />
  </div>
</template>
