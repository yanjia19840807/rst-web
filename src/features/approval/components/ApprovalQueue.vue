<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import QueryPanel from '@/components/QueryPanel.vue'
import TablePager from '@/components/TablePager.vue'
import TabStrip from '@/components/TabStrip.vue'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import AdMetric from '@/features/exercise-management/components/associated-data/AdMetric.vue'
import ToolkitInfoDialog from '@/features/exercise-management/components/ToolkitInfoDialog.vue'
import { exerciseApi } from '@/features/exercise-management/api'
import { exerciseQueryKeys } from '@/features/exercise-management/api/queries'
import type { Exercise } from '@/features/exercise-management/types'
import type { TimesheetAlignmentView } from '@/features/timesheet-alignment/types'

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

const emptyFilters = () => ({
  exerciseCode: '',
  toolkit: 'All toolkits',
  pl3: '',
  submittedFrom: '',
  submittedTo: '',
  decision: 'All decisions',
  completedFrom: '',
  completedTo: '',
})

const draft = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const page = ref(1)
const pageSize = ref(10)
const toolkitInfoOpen = ref(false)
const toolkitSnapshot = ref<Exercise['snapshot'] | null>(null)
const toolkitAlignment = ref<TimesheetAlignmentView | null>(null)
const fieldClass = 'w-[220px]'

const tabs: TabKey[] = ['Awaiting Review', 'Completed Task']

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
    exerciseCode: applied.exerciseCode || undefined,
    toolkitName: applied.toolkit === 'All toolkits' ? undefined : applied.toolkit,
    pl3Name: applied.pl3 || undefined,
    submittedFrom: completed ? undefined : applied.submittedFrom || undefined,
    submittedTo: completed ? undefined : applied.submittedTo || undefined,
    completedFrom: completed ? applied.completedFrom || undefined : undefined,
    completedTo: completed ? applied.completedTo || undefined : undefined,
    decision: !completed || applied.decision === 'All decisions' ? undefined : applied.decision,
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

const pl3Options = computed(() => pl3Names.value)

const toolkitOptions = computed(() => ['All toolkits', ...toolkitNames.value])

function applySearch() {
  Object.assign(applied, { ...draft })
  page.value = 1
}

function clearFilters() {
  Object.assign(draft, emptyFilters())
  Object.assign(applied, emptyFilters())
  page.value = 1
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
    toolkitAlignment.value = exercise.timesheetAlignment ?? null
    toolkitInfoOpen.value = true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load toolkit info.')
  }
}

function onTabChange(tab: TabKey) {
  if (tab === activeTab.value) return
  activeTab.value = tab
  Object.assign(draft, emptyFilters())
  Object.assign(applied, emptyFilters())
  page.value = 1
}

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
  <div class="grid min-w-0 gap-4">
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
        <TabStrip
          :tabs="tabs.map((tab) => ({ key: tab, label: tab }))"
          :model-value="activeTab"
          @update:model-value="onTabChange"
        />
      </CardHeader>
      <CardContent class="space-y-3">
        <QueryPanel :key="activeTab" @search="applySearch" @clear="clearFilters">
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Exercise Code
            <Input
              v-model="draft.exerciseCode"
              :class="fieldClass"
              placeholder="Search exercise code"
            />
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Toolkit
            <NativeSelect
              :class="fieldClass"
              :model-value="draft.toolkit"
              @update:model-value="draft.toolkit = String($event ?? 'All toolkits')"
            >
              <option v-for="option in toolkitOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            PL3
            <NativeSelect
              :class="fieldClass"
              :model-value="draft.pl3"
              @update:model-value="draft.pl3 = String($event ?? '')"
            >
              <option value="">All PL3</option>
              <option v-for="option in pl3Options" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </label>
          <template v-if="activeTab === 'Awaiting Review'">
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Submitted Date From
              <DatePicker
                v-model="draft.submittedFrom"
                aria-label="Submitted date from"
                placeholder="From"
                :class="fieldClass"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Submitted Date To
              <DatePicker
                v-model="draft.submittedTo"
                aria-label="Submitted date to"
                placeholder="To"
                :class="fieldClass"
              />
            </label>
          </template>
          <template v-else>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              My Decision
              <NativeSelect
                :class="fieldClass"
                :model-value="draft.decision"
                @update:model-value="draft.decision = String($event ?? 'All decisions')"
              >
                <option>All decisions</option>
                <option>Approved</option>
                <option>Returned</option>
              </NativeSelect>
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Completed Date From
              <DatePicker
                v-model="draft.completedFrom"
                aria-label="Completed date from"
                placeholder="From"
                :class="fieldClass"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Completed Date To
              <DatePicker
                v-model="draft.completedTo"
                aria-label="Completed date to"
                placeholder="To"
                :class="fieldClass"
              />
            </label>
          </template>
        </QueryPanel>

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
          :get-row-id="(row) => row.completedTaskId || row.submissionId"
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

    <ToolkitInfoDialog
      v-model:open="toolkitInfoOpen"
      :snapshot="toolkitSnapshot"
      :alignment="toolkitAlignment"
    />
  </div>
</template>
