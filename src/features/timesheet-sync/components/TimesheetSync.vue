<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'

import { PERMISSIONS } from '@/auth/permissions'
import { useSessionStore } from '@/auth/session'
import DomainHeadsDialog from '@/features/domain-heads/components/DomainHeadsDialog.vue'

import { useUploadTimesheetSync } from '../api/mutations'
import { useTimesheetSyncOverviewQuery } from '../api/queries'
import type { TimesheetSnapshotTab, TimesheetSyncOverviewQuery, TimesheetSyncRunHeader } from '../types'
import TimesheetSnapshotTables from './TimesheetSnapshotTables.vue'
import TimesheetSyncAlertDialog from './TimesheetSyncAlertDialog.vue'
import TimesheetSyncIssuesDialog from './TimesheetSyncIssuesDialog.vue'
import {
  createTimesheetActiveColumns,
  createTimesheetRunColumns,
  type TimesheetActiveRow,
} from './timesheetSyncColumns'

const kindFilter = ref('')
const statusFilter = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const page = ref(1)
const pageSize = ref(10)

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const listQuery = computed<TimesheetSyncOverviewQuery>(() => ({
  kind: kindFilter.value || undefined,
  status: statusFilter.value || undefined,
  dateFrom: dateFrom.value || undefined,
  dateTo: dateTo.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const session = useSessionStore()
const overviewQuery = useTimesheetSyncOverviewQuery(listQuery)
const uploadMutation = useUploadTimesheetSync()
const selectedRun = ref<TimesheetSyncRunHeader | null>(null)
const issuesOpen = ref(false)
const mappedOpen = ref(false)
const mappedKind = ref<'DAILY' | 'MONTHLY'>('DAILY')
const mappedTab = ref<TimesheetSnapshotTab>('people')
const alertOpen = ref(false)
const domainHeadOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const canConfigureDomainHeads = computed(() => session.hasPermission(PERMISSIONS.domainHeadConfig))

const overview = computed(() => overviewQuery.data.value)
const runs = computed(() => overview.value?.runs.items ?? [])
const total = computed(() => overview.value?.runs.total ?? 0)
const loading = computed(() => overviewQuery.isPending.value && !overviewQuery.data.value)
const hasFilters = computed(
  () => Boolean(kindFilter.value || statusFilter.value || dateFrom.value || dateTo.value),
)

const snapshots = computed<TimesheetActiveRow[]>(() =>
  overview.value
    ? [
        { kind: 'DAILY', run: overview.value.daily },
        { kind: 'MONTHLY', run: overview.value.monthly },
      ]
    : [],
)

const missingActiveKinds = computed(() => {
  if (!overviewQuery.isSuccess.value || !overview.value) return []
  const missing: Array<'Daily' | 'Monthly'> = []
  if (!overview.value.daily) missing.push('Daily')
  if (!overview.value.monthly) missing.push('Monthly')
  return missing
})

const missingActiveLabel = computed(() => {
  const kinds = missingActiveKinds.value
  if (kinds.length === 2) return 'Daily or Monthly'
  return kinds[0] ?? ''
})

const activeColumns = computed(() => createTimesheetActiveColumns({ onViewTables: openMapped }))
const runColumns = computed(() => createTimesheetRunColumns({ onViewIssues: openIssues }))

watch([kindFilter, statusFilter, dateFrom, dateTo], () => {
  page.value = 1
})

watch(
  () => ({
    totalPages: overview.value?.runs.totalPages,
    fetching: overviewQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

watch(
  () => overviewQuery.isError.value,
  (isError) => {
    if (isError) {
      toast.error(
        overviewQuery.error.value instanceof Error
          ? overviewQuery.error.value.message
          : 'Could not load Timesheet sync status.',
      )
    }
  },
)

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || uploadMutation.isPending.value) return
  try {
    const result = await uploadMutation.mutateAsync(file)
    page.value = 1
    toast.success(
      result.status === 'ACTIVE'
        ? `${result.kind} snapshot is now ACTIVE.`
        : `${result.kind} sync finished with status ${result.status}.`,
    )
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not upload Timesheet file.')
  }
}

function openIssues(row: TimesheetSyncRunHeader) {
  selectedRun.value = row
  issuesOpen.value = true
}

function openMapped(row: TimesheetActiveRow, tab: TimesheetSnapshotTab) {
  if (!row.run) return
  mappedKind.value = row.kind
  mappedTab.value = tab
  mappedOpen.value = true
}
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <Alert v-if="missingActiveKinds.length" variant="warning">
      <TriangleAlert />
      <AlertTitle>No ACTIVE Timesheet snapshot</AlertTitle>
      <AlertDescription>
        No ACTIVE {{ missingActiveLabel }} Timesheet snapshot is available. Upload a report or wait
        for SharePoint auto-sync.
      </AlertDescription>
    </Alert>

    <PageActions>
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx"
        class="hidden"
        @change="onFile"
      />
      <Button variant="outline" @click="alertOpen = true">Email alerts</Button>
      <Button
        v-if="canConfigureDomainHeads"
        variant="outline"
        @click="domainHeadOpen = true"
      >
        Domain Head
      </Button>
      <Button :loading="uploadMutation.isPending.value" @click="fileInput?.click()">
        {{ uploadMutation.isPending.value ? 'Uploading…' : 'Upload and sync' }}
      </Button>
    </PageActions>

    <Card>
      <CardHeader>
        <div>
          <CardTitle>ACTIVE snapshots</CardTitle>
          <CardDescription>
            Latest successful Daily and Monthly snapshots. Auto-sync still reads SharePoint;
            uploads go to Manual.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          :columns="activeColumns"
          :data="snapshots"
          :pending="loading"
          empty-text="No ACTIVE snapshots."
          table-class="min-w-[1180px]"
          :get-row-id="(row) => row.kind"
        />
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader>
        <CardTitle>Recent runs</CardTitle>
        <CardDescription>
          History of Daily and Monthly sync attempts, including failed and archived runs.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap items-end gap-2.5">
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Kind
            <select v-model="kindFilter" :class="[selectClass, 'w-[160px]']">
              <option value="">All kinds</option>
              <option value="DAILY">DAILY</option>
              <option value="MONTHLY">MONTHLY</option>
            </select>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Status
            <select v-model="statusFilter" :class="[selectClass, 'w-[180px]']">
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="FAILED">FAILED</option>
              <option value="LOADING">LOADING</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Date From
            <DatePicker
              v-model="dateFrom"
              aria-label="Sync date from"
              placeholder="From"
              class="w-[180px]"
            />
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Date To
            <DatePicker
              v-model="dateTo"
              aria-label="Sync date to"
              placeholder="To"
              class="w-[180px]"
            />
          </label>
        </div>

        <DataTable
          :columns="runColumns"
          :data="runs"
          :pending="loading"
          :empty-text="
            hasFilters ? 'No matching Timesheet sync runs.' : 'No Timesheet sync runs yet.'
          "
          table-class="min-w-[1180px]"
          :get-row-id="(row) => row.id"
        />

        <TablePager
          :total="total"
          :page="page"
          :page-size="pageSize"
          label="runs"
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

    <TimesheetSnapshotTables
      v-model:open="mappedOpen"
      :kind="mappedKind"
      :initial-tab="mappedTab"
    />
    <TimesheetSyncIssuesDialog
      v-model:open="issuesOpen"
      :run-id="selectedRun?.id ?? null"
      :run="selectedRun"
    />
    <TimesheetSyncAlertDialog v-model:open="alertOpen" />
    <DomainHeadsDialog v-model:open="domainHeadOpen" />
  </div>
</template>
