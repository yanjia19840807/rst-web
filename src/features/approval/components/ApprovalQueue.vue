<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'

import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import AdMetric from '@/features/exercise-management/components/associated-data/AdMetric.vue'
import ToolkitInfoDialog from '@/features/exercise-management/components/ToolkitInfoDialog.vue'
import { exerciseApi } from '@/features/exercise-management/api'
import { exerciseQueryKeys } from '@/features/exercise-management/api/queries'
import type { Exercise } from '@/features/exercise-management/types'

import { useApprovalQueueQuery } from '../api/queries'
import type { ApprovalQueueItem, ApprovalQueueQuery } from '../types'
import {
  approvalQueueVisibility,
  createApprovalQueueColumns,
} from './approvalQueueColumns'

type TabKey = 'Awaiting Review' | 'Completed Task'

const router = useRouter()
const queryClient = useQueryClient()
const activeTab = ref<TabKey>('Awaiting Review')

const exerciseFilter = ref('')
const appliedExerciseCode = ref('')
const pl3Filter = ref('All PL3')
const toolkitFilter = ref('All toolkits')
const submittedFrom = ref('')
const submittedTo = ref('')
const draftSubmittedFrom = ref('')
const draftSubmittedTo = ref('')
const decisionFilter = ref('All decisions')
const completedFrom = ref('')
const completedTo = ref('')
const draftCompletedFrom = ref('')
const draftCompletedTo = ref('')
const moreFiltersOpen = ref(false)
const page = ref(1)
const pageSize = ref(10)
const toolkitInfoOpen = ref(false)
const toolkitSnapshot = ref<Exercise['snapshot'] | null>(null)

const tabs: TabKey[] = ['Awaiting Review', 'Completed Task']
const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const columns = computed(() =>
  createApprovalQueueColumns({
    tab: activeTab.value,
    onReview: openReview,
    onToolkitInfo: (item) => {
      void openToolkit(item)
    },
  }),
)

const columnVisibility = computed(() => approvalQueueVisibility(activeTab.value))

const listQuery = computed<ApprovalQueueQuery>(() => {
  const completed = activeTab.value === 'Completed Task'
  return {
    status: 'AWAITING',
    completed,
    exerciseCode: appliedExerciseCode.value,
    toolkitName: toolkitFilter.value === 'All toolkits' ? undefined : toolkitFilter.value,
    pl3Name: pl3Filter.value === 'All PL3' ? undefined : pl3Filter.value,
    submittedFrom: completed ? undefined : submittedFrom.value || undefined,
    submittedTo: completed ? undefined : submittedTo.value || undefined,
    completedFrom: completed ? completedFrom.value || undefined : undefined,
    completedTo: completed ? completedTo.value || undefined : undefined,
    decision:
      !completed || decisionFilter.value === 'All decisions'
        ? undefined
        : decisionFilter.value,
    page: page.value,
    pageSize: pageSize.value,
  }
})

const queueQuery = useApprovalQueueQuery(listQuery)
const items = computed(() => queueQuery.data.value?.items ?? [])
const total = computed(() => queueQuery.data.value?.total ?? 0)
const metrics = computed(
  () =>
    queueQuery.data.value?.metrics ?? {
      awaitingMe: 0,
      overdue: 0,
      dueWithin2Days: 0,
      highRisk: 0,
    },
)
const toolkitNames = computed(() => queueQuery.data.value?.toolkitNames ?? [])
const pl3Names = computed(() => queueQuery.data.value?.pl3Names ?? [])
const loading = computed(() => queueQuery.isPending.value && !queueQuery.data.value)

const pl3Options = computed(() => ['All PL3', ...pl3Names.value])

const toolkitOptions = computed(() => ['All toolkits', ...toolkitNames.value])

const advancedFilterCount = computed(() =>
  activeTab.value === 'Awaiting Review'
    ? Number(Boolean(submittedFrom.value || submittedTo.value))
    : Number(Boolean(completedFrom.value || completedTo.value)),
)

function resetPage() {
  page.value = 1
}

function toggleMoreFilters() {
  if (!moreFiltersOpen.value) {
    if (activeTab.value === 'Awaiting Review') {
      draftSubmittedFrom.value = submittedFrom.value
      draftSubmittedTo.value = submittedTo.value
    } else {
      draftCompletedFrom.value = completedFrom.value
      draftCompletedTo.value = completedTo.value
    }
  }
  moreFiltersOpen.value = !moreFiltersOpen.value
}

function clearAdvancedDraft() {
  if (activeTab.value === 'Awaiting Review') {
    draftSubmittedFrom.value = ''
    draftSubmittedTo.value = ''
  } else {
    draftCompletedFrom.value = ''
    draftCompletedTo.value = ''
  }
}

function applyAdvancedFilters() {
  if (activeTab.value === 'Awaiting Review') {
    submittedFrom.value = draftSubmittedFrom.value
    submittedTo.value = draftSubmittedTo.value
  } else {
    completedFrom.value = draftCompletedFrom.value
    completedTo.value = draftCompletedTo.value
  }
  resetPage()
  moreFiltersOpen.value = false
}

function openReview(item: ApprovalQueueItem) {
  void router.push({
    name: 'approver-review',
    params: { submissionId: item.submissionId },
  })
}

async function openToolkit(item: ApprovalQueueItem) {
  if (!item.exerciseId) return
  try {
    const exercise = await queryClient.fetchQuery({
      queryKey: exerciseQueryKeys.detail(item.exerciseId),
      queryFn: () => exerciseApi.detail(item.exerciseId),
    })
    toolkitSnapshot.value = exercise.snapshot
    toolkitInfoOpen.value = true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load toolkit info.')
  }
}

function onTabChange(tab: TabKey) {
  activeTab.value = tab
  exerciseFilter.value = ''
  appliedExerciseCode.value = ''
  toolkitFilter.value = 'All toolkits'
  pl3Filter.value = 'All PL3'
  submittedFrom.value = ''
  submittedTo.value = ''
  draftSubmittedFrom.value = ''
  draftSubmittedTo.value = ''
  decisionFilter.value = 'All decisions'
  completedFrom.value = ''
  completedTo.value = ''
  draftCompletedFrom.value = ''
  draftCompletedTo.value = ''
  moreFiltersOpen.value = false
  resetPage()
}

watch(
  [
    toolkitFilter,
    pl3Filter,
    decisionFilter,
    submittedFrom,
    submittedTo,
    completedFrom,
    completedTo,
  ],
  () => {
    resetPage()
  },
)

watchDebounced(
  exerciseFilter,
  (value) => {
    appliedExerciseCode.value = value
    resetPage()
  },
  { debounce: 400 },
)

watch(
  () => ({
    totalPages: queueQuery.data.value?.totalPages,
    fetching: queueQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

watch(
  () => queueQuery.isError.value,
  (isError) => {
    if (isError) {
      toast.error(
        queueQuery.error.value instanceof Error
          ? queueQuery.error.value.message
          : 'Could not load approval queue.',
      )
    }
  },
)
</script>

<template>
  <div class="grid gap-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AdMetric label="Awaiting Me" :value="String(metrics.awaitingMe)" hint="Current approval step" />
      <AdMetric label="Overdue" :value="String(metrics.overdue)" hint="Aging 5 days or more" />
      <AdMetric
        label="Due Within 2 Days"
        :value="String(metrics.dueWithin2Days)"
        hint="Approaching review target"
      />
      <AdMetric
        label="High-risk Submissions"
        :value="String(metrics.highRisk)"
        hint="Requires priority review"
      />
    </div>

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
            @click="onTabChange(tab)"
          >
            {{ tab }}
          </button>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        <template v-if="activeTab === 'Awaiting Review'">
          <div class="flex flex-wrap items-end gap-2.5">
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Exercise Code
              <Input
                v-model="exerciseFilter"
                class="w-[210px]"
                placeholder="Search exercise code"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Toolkit
              <select v-model="toolkitFilter" :class="[selectClass, 'w-[210px]']">
                <option v-for="option in toolkitOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              PL3
              <select v-model="pl3Filter" :class="[selectClass, 'w-[210px]']">
                <option v-for="option in pl3Options" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
            <Button variant="outline" @click="toggleMoreFilters">
              More Filters{{ advancedFilterCount ? ` (${advancedFilterCount})` : '' }}
            </Button>
          </div>
          <div
            v-if="moreFiltersOpen"
            class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3"
          >
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Submitted Date From
              <DatePicker
                v-model="draftSubmittedFrom"
                aria-label="Submitted date from"
                placeholder="From"
                class="w-[180px]"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Submitted Date To
              <DatePicker
                v-model="draftSubmittedTo"
                aria-label="Submitted date to"
                placeholder="To"
                class="w-[180px]"
              />
            </label>
            <Button variant="outline" @click="clearAdvancedDraft">Clear</Button>
            <Button @click="applyAdvancedFilters">Apply Filters</Button>
          </div>
        </template>

        <template v-else>
          <div class="flex flex-wrap items-end gap-2.5">
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Exercise Code
              <Input
                v-model="exerciseFilter"
                class="w-[220px]"
                placeholder="Search exercise code"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Toolkit
              <select v-model="toolkitFilter" :class="[selectClass, 'w-[240px]']">
                <option v-for="option in toolkitOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              PL3
              <select v-model="pl3Filter" :class="[selectClass, 'w-[210px]']">
                <option v-for="option in pl3Options" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              My Decision
              <select v-model="decisionFilter" :class="[selectClass, 'w-[170px]']">
                <option>All decisions</option>
                <option>Approved</option>
                <option>Returned</option>
              </select>
            </label>
            <Button variant="outline" @click="toggleMoreFilters">
              More Filters{{ advancedFilterCount ? ` (${advancedFilterCount})` : '' }}
            </Button>
          </div>
          <div
            v-if="moreFiltersOpen"
            class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3"
          >
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Completed Date From
              <DatePicker
                v-model="draftCompletedFrom"
                aria-label="Completed date from"
                placeholder="From"
                class="w-[180px]"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Completed Date To
              <DatePicker
                v-model="draftCompletedTo"
                aria-label="Completed date to"
                placeholder="To"
                class="w-[180px]"
              />
            </label>
            <Button variant="outline" @click="clearAdvancedDraft">Clear</Button>
            <Button @click="applyAdvancedFilters">Apply Filters</Button>
          </div>
        </template>

        <DataTable
          :columns="columns"
          :data="items"
          :pending="loading"
          :empty-text="
            activeTab === 'Awaiting Review'
              ? 'No submitted records found.'
              : 'No completed tasks found.'
          "
          :table-class="activeTab === 'Awaiting Review' ? 'min-w-[1520px]' : 'min-w-[1320px]'"
          :get-row-id="(row) => row.submissionId"
          :column-visibility="columnVisibility"
        />

        <TablePager
          :total="total"
          :page="page"
          :page-size="pageSize"
          :label="activeTab === 'Awaiting Review' ? 'submitted records' : 'completed tasks'"
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

    <ToolkitInfoDialog v-model:open="toolkitInfoOpen" :snapshot="toolkitSnapshot" />
  </div>
</template>
