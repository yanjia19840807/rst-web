<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import QueryPanel from '@/components/QueryPanel.vue'
import TablePager from '@/components/TablePager.vue'
import TabStrip from '@/components/TabStrip.vue'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/month-picker'
import { NativeSelect } from '@/components/ui/native-select'
import AdMetric from '@/features/exercise-management/components/associated-data/AdMetric.vue'
import ToolkitInfoDialog from '@/features/exercise-management/components/ToolkitInfoDialog.vue'
import { exerciseApi } from '@/features/exercise-management/api'
import { exerciseQueryKeys } from '@/features/exercise-management/api/queries'
import type { Exercise } from '@/features/exercise-management/types'
import type { TimesheetAlignmentView } from '@/features/timesheet-alignment/types'

import {
  AWAITING_REVIEW_TAB,
  COMPLETED_TASK_TAB,
  approvalQueueTabFromQuery,
  approvalQueueTabQuery,
  type ApprovalQueueTab,
} from '../approvalQueueTabs'
import { useApprovalQueueQuery } from '../api/queries'
import type { ApprovalQueueItem, ApprovalQueueQuery } from '../types'
import {
  approvalQueueVisibility,
  createApprovalQueueColumns,
} from './approvalQueueColumns'

const router = useRouter()
const route = useRoute()
const queryClient = useQueryClient()
const activeTab = ref<ApprovalQueueTab>(approvalQueueTabFromQuery(route.query.tab))

const emptyFilters = () => ({
  exerciseCode: '',
  toolkit: '',
  sizingMonth: '',
  submittedFrom: '',
  submittedTo: '',
  completedFrom: '',
  completedTo: '',
  center: '',
  domain: '',
  pl3: '',
  carrier: '',
  site: '',
  customerCountry: '',
  decision: '',
})

const draft = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const page = ref(1)
const pageSize = ref(10)
const toolkitInfoOpen = ref(false)
const toolkitSnapshot = ref<Exercise['snapshot'] | null>(null)
const toolkitAlignment = ref<TimesheetAlignmentView | null>(null)
const fieldClass = 'w-[220px]'

const tabs: ApprovalQueueTab[] = [AWAITING_REVIEW_TAB, COMPLETED_TASK_TAB]

const columns = computed(() =>
  createApprovalQueueColumns({
    tab: activeTab.value,
    onToolkitInfo: (item) => {
      void openToolkit(item)
    },
  }),
)

const columnVisibility = computed(() => approvalQueueVisibility(activeTab.value))

const listQuery = computed<ApprovalQueueQuery>(() => {
  const completed = activeTab.value === COMPLETED_TASK_TAB
  return {
    status: 'AWAITING',
    completed,
    exerciseCode: applied.exerciseCode || undefined,
    toolkitName: applied.toolkit || undefined,
    center: applied.center || undefined,
    domain: applied.domain || undefined,
    pl3Name: applied.pl3 || undefined,
    carrier: applied.carrier || undefined,
    site: applied.site || undefined,
    customerCountry: applied.customerCountry || undefined,
    sizingMonth: applied.sizingMonth || undefined,
    submittedFrom: completed ? undefined : applied.submittedFrom || undefined,
    submittedTo: completed ? undefined : applied.submittedTo || undefined,
    completedFrom: completed ? applied.completedFrom || undefined : undefined,
    completedTo: completed ? applied.completedTo || undefined : undefined,
    decision: !completed || !applied.decision ? undefined : applied.decision,
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
const toolkitOptions = computed(() => queueQuery.data.value?.toolkitNames ?? [])
const centerOptions = computed(() => queueQuery.data.value?.centers ?? [])
const domainOptions = computed(() => queueQuery.data.value?.domains ?? [])
const pl3Options = computed(() => queueQuery.data.value?.pl3Names ?? [])
const carrierOptions = computed(() => queueQuery.data.value?.carriers ?? [])
const siteOptions = computed(() => queueQuery.data.value?.sites ?? [])
const customerCountryOptions = computed(() => queueQuery.data.value?.customerCountries ?? [])
const loading = computed(() => queueQuery.isPending.value && !queueQuery.data.value)

function applySearch() {
  Object.assign(applied, { ...draft })
  page.value = 1
}

function clearFilters() {
  Object.assign(draft, emptyFilters())
  Object.assign(applied, emptyFilters())
  page.value = 1
}

function persistTab(tab: ApprovalQueueTab) {
  const next = approvalQueueTabQuery(tab)
  if (route.query.tab === next) return
  void router.replace({
    name: 'approver-queue',
    query: { ...route.query, tab: next },
  })
}

persistTab(activeTab.value)

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

function onTabChange(tab: ApprovalQueueTab) {
  if (tab === activeTab.value) {
    persistTab(tab)
    return
  }
  activeTab.value = tab
  Object.assign(draft, emptyFilters())
  Object.assign(applied, emptyFilters())
  page.value = 1
  persistTab(tab)
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

watch(
  () => route.query.tab,
  (tab) => {
    const next = approvalQueueTabFromQuery(tab)
    if (next === activeTab.value) return
    activeTab.value = next
    Object.assign(draft, emptyFilters())
    Object.assign(applied, emptyFilters())
    page.value = 1
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
            Exercise No
            <Input
              v-model="draft.exerciseCode"
              :class="fieldClass"
              placeholder="Search exercise no"
            />
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Toolkit
            <NativeSelect
              placeholder="All"
              :class="fieldClass"
              :model-value="draft.toolkit"
              @update:model-value="draft.toolkit = String($event ?? '')"
            >
              <option v-for="option in toolkitOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Sizing Month
            <MonthPicker
              v-model="draft.sizingMonth"
              aria-label="Sizing month"
              placeholder="All months"
              :class="fieldClass"
            />
          </label>
          <template v-if="activeTab === 'Awaiting Review'">
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Submitted From
              <DatePicker
                v-model="draft.submittedFrom"
                aria-label="Submitted date from"
                placeholder="From"
                :class="fieldClass"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Submitted To
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
              Completed From
              <DatePicker
                v-model="draft.completedFrom"
                aria-label="Completed date from"
                placeholder="From"
                :class="fieldClass"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Completed To
              <DatePicker
                v-model="draft.completedTo"
                aria-label="Completed date to"
                placeholder="To"
                :class="fieldClass"
              />
            </label>
          </template>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            GBS Center
            <NativeSelect
              placeholder="All"
              :class="fieldClass"
              :model-value="draft.center"
              @update:model-value="draft.center = String($event ?? '')"
            >
              <option v-for="option in centerOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Domain
            <NativeSelect
              placeholder="All"
              :class="fieldClass"
              :model-value="draft.domain"
              @update:model-value="draft.domain = String($event ?? '')"
            >
              <option v-for="option in domainOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            PL3
            <NativeSelect
              placeholder="All"
              :class="fieldClass"
              :model-value="draft.pl3"
              @update:model-value="draft.pl3 = String($event ?? '')"
            >
              <option v-for="option in pl3Options" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Carrier
            <NativeSelect
              placeholder="All"
              :class="fieldClass"
              :model-value="draft.carrier"
              @update:model-value="draft.carrier = String($event ?? '')"
            >
              <option v-for="option in carrierOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            GBS Site
            <NativeSelect
              placeholder="All"
              :class="fieldClass"
              :model-value="draft.site"
              @update:model-value="draft.site = String($event ?? '')"
            >
              <option v-for="option in siteOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Customer Country
            <NativeSelect
              placeholder="All"
              :class="fieldClass"
              :model-value="draft.customerCountry"
              @update:model-value="draft.customerCountry = String($event ?? '')"
            >
              <option v-for="option in customerCountryOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </label>
          <label
            v-if="activeTab === 'Completed Task'"
            class="grid gap-1.5 text-xs text-muted-foreground"
          >
            My Decision
            <NativeSelect
              placeholder="All"
              :class="fieldClass"
              :model-value="draft.decision"
              @update:model-value="draft.decision = String($event ?? '')"
            >
              <option>Approved</option>
              <option>Returned</option>
            </NativeSelect>
          </label>
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
          :table-class="activeTab === 'Awaiting Review' ? 'min-w-[2600px]' : 'min-w-[2400px]'"
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
      show-delivery-hc
      :snapshot="toolkitSnapshot"
      :alignment="toolkitAlignment"
    />
  </div>
</template>
