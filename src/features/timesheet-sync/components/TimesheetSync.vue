<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import PageActions from '@/components/PageActions.vue'
import QueryPanel from '@/components/QueryPanel.vue'
import TablePager from '@/components/TablePager.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { useCenterCatalogStore } from '@/catalog/centerCatalog'
import { PERMISSIONS } from '@/auth/permissions'
import { useSessionStore } from '@/auth/session'
import DomainHeadsDialog from '@/features/domain-heads/components/DomainHeadsDialog.vue'
import { triggerDownload } from '@/features/exercise-management/downloadBlob'

import { timesheetSyncApi } from '../api'
import { useUploadTimesheetSync } from '../api/mutations'
import { useTimesheetSyncOverviewQuery } from '../api/queries'
import type { TimesheetSnapshotTab, TimesheetSyncOverviewQuery, TimesheetSyncRunHeader } from '../types'
import {
  emptyTimesheetSyncFilters,
  matchesSyncDate,
  toSyncDateRange,
} from '../timesheetSyncFilters'
import TimesheetSnapshotTables from './TimesheetSnapshotTables.vue'
import TimesheetSyncAlertDialog from './TimesheetSyncAlertDialog.vue'
import TimesheetSyncFilterFields from './TimesheetSyncFilterFields.vue'
import TimesheetSyncIssuesDialog from './TimesheetSyncIssuesDialog.vue'
import {
  createTimesheetActiveColumns,
  createTimesheetRunColumns,
  type TimesheetActiveRow,
} from './timesheetSyncColumns'

const catalog = useCenterCatalogStore()
const centerOptions = computed(() => catalog.items.map((item) => item.center))

const draftActive = reactive(emptyTimesheetSyncFilters())
const appliedActive = reactive(emptyTimesheetSyncFilters())
const draftRuns = reactive(emptyTimesheetSyncFilters())
const appliedRuns = reactive(emptyTimesheetSyncFilters())

const page = ref(1)
const pageSize = ref(10)

const listQuery = computed<TimesheetSyncOverviewQuery>(() => {
  const dates = toSyncDateRange(appliedRuns)
  return {
    kind: appliedRuns.kind || undefined,
    status: appliedRuns.status || undefined,
    center: appliedRuns.center || undefined,
    sourceType: appliedRuns.sourceType || undefined,
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    page: page.value,
    pageSize: pageSize.value,
  }
})

const session = useSessionStore()
const overviewQuery = useTimesheetSyncOverviewQuery(listQuery)
const uploadMutation = useUploadTimesheetSync()
const selectedRun = ref<TimesheetSyncRunHeader | null>(null)
const issuesOpen = ref(false)
const mappedOpen = ref(false)
const mappedKind = ref<'DAILY' | 'MONTHLY'>('DAILY')
const mappedCenter = ref('')
const mappedFileDate = ref('')
const mappedTab = ref<TimesheetSnapshotTab>('people')
const alertOpen = ref(false)
const domainHeadOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const canConfigureDomainHeads = computed(() => session.hasPermission(PERMISSIONS.domainHeadConfig))

const overview = computed(() => overviewQuery.data.value)
const runs = computed(() => overview.value?.runs.items ?? [])
const total = computed(() => overview.value?.runs.total ?? 0)
const loading = computed(() => overviewQuery.isPending.value && !overviewQuery.data.value)
const hasRunFilters = computed(() =>
  Boolean(
    appliedRuns.kind ||
      appliedRuns.status ||
      appliedRuns.center ||
      appliedRuns.sourceType ||
      appliedRuns.syncDateFrom ||
      appliedRuns.syncDateTo,
  ),
)

const allSnapshots = computed<TimesheetActiveRow[]>(() =>
  overview.value
    ? [
        ...(overview.value.daily ?? []).map((run) => ({ kind: 'DAILY' as const, run })),
        ...(overview.value.monthly ?? []).map((run) => ({ kind: 'MONTHLY' as const, run })),
      ]
    : [],
)

const snapshots = computed(() =>
  allSnapshots.value.filter((row) => {
    const run = row.run
    if (!run) return false
    if (appliedActive.center && run.center !== appliedActive.center) return false
    if (appliedActive.kind && row.kind !== appliedActive.kind) return false
    if (appliedActive.sourceType && (run.sourceType ?? '').toUpperCase() !== appliedActive.sourceType) {
      return false
    }
    return matchesSyncDate(run.syncDate, appliedActive)
  }),
)

const missingActiveKinds = computed(() => {
  if (!overviewQuery.isSuccess.value || !overview.value) return []
  const missing: Array<'Daily' | 'Monthly'> = []
  if ((overview.value.daily ?? []).length === 0) missing.push('Daily')
  if ((overview.value.monthly ?? []).length === 0) missing.push('Monthly')
  return missing
})

const missingActiveLabel = computed(() => {
  const kinds = missingActiveKinds.value
  if (kinds.length === 2) return 'Daily or Monthly'
  return kinds[0] ?? ''
})

const activeColumns = computed(() =>
  createTimesheetActiveColumns({ onViewTables: openMapped, onDownload: downloadFile }),
)
const runColumns = computed(() =>
  createTimesheetRunColumns({ onViewIssues: openIssues, onDownload: downloadFile }),
)

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

function applyActive() {
  Object.assign(appliedActive, { ...draftActive })
}

function clearActive() {
  Object.assign(draftActive, emptyTimesheetSyncFilters())
  Object.assign(appliedActive, emptyTimesheetSyncFilters())
}

function applyRuns() {
  Object.assign(appliedRuns, { ...draftRuns })
  page.value = 1
}

function clearRuns() {
  Object.assign(draftRuns, emptyTimesheetSyncFilters())
  Object.assign(appliedRuns, emptyTimesheetSyncFilters())
  page.value = 1
}

function openIssues(row: TimesheetSyncRunHeader) {
  selectedRun.value = row
  issuesOpen.value = true
}

function openMapped(row: TimesheetActiveRow, tab: TimesheetSnapshotTab) {
  if (!row.run) return
  mappedKind.value = row.kind
  mappedCenter.value = row.run.center ?? ''
  mappedFileDate.value = row.run.syncDate ?? ''
  mappedTab.value = tab
  mappedOpen.value = true
}

async function downloadFile(row: TimesheetSyncRunHeader) {
  try {
    const result = await timesheetSyncApi.download(row.id, row.sourceFileName || 'timesheet.xlsx')
    triggerDownload(result.blob, result.filename)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'File is no longer available.')
  }
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
        Center Roles
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
            Latest successful Daily and Monthly snapshot per Center. Auto-sync still reads
            SharePoint; uploads go to Manual.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        <QueryPanel title="Filters" @search="applyActive" @clear="clearActive">
          <TimesheetSyncFilterFields :draft="draftActive" :center-options="centerOptions" />
        </QueryPanel>
        <DataTable
          :columns="activeColumns"
          :data="snapshots"
          :pending="loading"
          empty-text="No ACTIVE snapshots."
          table-class="min-w-[1180px]"
          :get-row-id="(row) => `${row.kind}:${row.run?.center ?? ''}`"
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
        <QueryPanel title="Filters" @search="applyRuns" @clear="clearRuns">
          <TimesheetSyncFilterFields
            :draft="draftRuns"
            show-status
            :center-options="centerOptions"
          />
        </QueryPanel>

        <DataTable
          :columns="runColumns"
          :data="runs"
          :pending="loading"
          :empty-text="
            hasRunFilters ? 'No matching Timesheet sync runs.' : 'No Timesheet sync runs yet.'
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
      :center="mappedCenter"
      :file-date="mappedFileDate"
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
