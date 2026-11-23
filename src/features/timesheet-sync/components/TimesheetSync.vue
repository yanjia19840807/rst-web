<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

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
import { useCenterSourcesQuery } from '@/features/source-data/queries'
import { triggerDownload } from '@/features/exercise-management/downloadBlob'

import { timesheetSyncApi } from '../api'
import { useUploadTimesheetSync } from '../api/mutations'
import { useTimesheetSyncOverviewQuery } from '../api/queries'
import type { TimesheetSyncOverviewQuery, TimesheetSyncRunHeader } from '../types'
import {
  emptyTimesheetSyncFilters,
  matchesSyncDate,
  toSyncDateRange,
} from '../timesheetSyncFilters'
import TimesheetSyncAlertDialog from './TimesheetSyncAlertDialog.vue'
import TimesheetSyncFilterFields from './TimesheetSyncFilterFields.vue'
import TimesheetSyncIssuesDialog from './TimesheetSyncIssuesDialog.vue'
import { createTimesheetActiveColumns, createTimesheetRunColumns } from './timesheetSyncColumns'

const props = withDefaults(
  defineProps<{
    showCenterRoles?: boolean
    lockCenter?: string
    showAlerts?: boolean
    allowUpload?: boolean
  }>(),
  { showCenterRoles: true, lockCenter: '', showAlerts: true, allowUpload: true },
)

const catalog = useCenterCatalogStore()
const sourcesQuery = useCenterSourcesQuery()
const timesheetCenters = computed(
  () =>
    new Set(
      (sourcesQuery.data.value ?? [])
        .filter((row) => row.mode === 'TIMESHEET')
        .map((row) => row.center),
    ),
)
const centerOptions = computed(() => {
  if (props.lockCenter) return [props.lockCenter]
  return catalog.items
    .map((item) => item.center)
    .filter((center) => timesheetCenters.value.has(center))
})

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
    center: props.lockCenter || appliedRuns.center || undefined,
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
const alertOpen = ref(false)
const domainHeadOpen = ref(false)
const downloadingIds = ref<string[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const canConfigureDomainHeads = computed(() => session.hasPermission(PERMISSIONS.domainHeadConfig))

const overview = computed(() => overviewQuery.data.value)
function keptTimesheetRun(center: string | null | undefined) {
  if (!sourcesQuery.isSuccess.value) return true
  return timesheetCenters.value.has(center ?? '')
}

const runs = computed(() =>
  (overview.value?.runs.items ?? []).filter((row) => keptTimesheetRun(row.center)),
)
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
    if (!run || !keptTimesheetRun(run.center)) return false
    const centerFilter = props.lockCenter || appliedActive.center
    if (centerFilter && run.center !== centerFilter) return false
    if (appliedActive.kind && row.kind !== appliedActive.kind) return false
    if (appliedActive.sourceType && (run.sourceType ?? '').toUpperCase() !== appliedActive.sourceType) {
      return false
    }
    return matchesSyncDate(run.syncDate, appliedActive)
  }),
)

watch(
  () => props.lockCenter,
  (center) => {
    if (!center) return
    for (const draft of [draftActive, appliedActive, draftRuns, appliedRuns]) {
      draft.center = center
    }
  },
  { immediate: true },
)

watch(centerOptions, (options) => {
  if (props.lockCenter) return
  if (!sourcesQuery.isSuccess.value || catalog.items.length === 0) return
  for (const draft of [draftActive, appliedActive, draftRuns, appliedRuns]) {
    if (draft.center && !options.includes(draft.center)) draft.center = ''
  }
})

const missingActiveKinds = computed(() => {
  if (!overviewQuery.isSuccess.value || !overview.value) return []
  const missing: Array<'Daily' | 'Monthly'> = []
  const daily = (overview.value.daily ?? []).filter((run) => keptTimesheetRun(run.center))
  const monthly = (overview.value.monthly ?? []).filter((run) => keptTimesheetRun(run.center))
  if (daily.length === 0) missing.push('Daily')
  if (monthly.length === 0) missing.push('Monthly')
  return missing
})

const missingActiveLabel = computed(() => {
  const kinds = missingActiveKinds.value
  if (kinds.length === 2) return 'Daily or Monthly'
  return kinds[0] ?? ''
})

const activeColumns = computed(() =>
  createTimesheetActiveColumns({
    onDownload: downloadRun,
    downloadingIds: downloadingIds.value,
  }),
)
const runColumns = computed(() =>
  createTimesheetRunColumns({
    onViewIssues: openIssues,
    onDownload: downloadRun,
    downloadingIds: downloadingIds.value,
  }),
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

async function downloadRun(row: TimesheetSyncRunHeader) {
  if (!row.hasSourceFile || !row.id || downloadingIds.value.includes(row.id)) return
  downloadingIds.value = [...downloadingIds.value, row.id]
  try {
    const result = await timesheetSyncApi.download(row.id, row.sourceFileName || 'timesheet.xlsx')
    triggerDownload(result.blob, result.filename)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'File is no longer available.')
  } finally {
    downloadingIds.value = downloadingIds.value.filter((id) => id !== row.id)
  }
}
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <div class="flex flex-wrap items-center justify-end gap-2">
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx"
        class="hidden"
        @change="onFile"
      />
      <Button v-if="showAlerts" variant="outline" @click="alertOpen = true">Email alerts</Button>
      <Button
        v-if="props.showCenterRoles && canConfigureDomainHeads"
        variant="outline"
        @click="domainHeadOpen = true"
      >
        Center Roles
      </Button>
      <Button
        v-if="allowUpload"
        :loading="uploadMutation.isPending.value"
        @click="fileInput?.click()"
      >
        {{ uploadMutation.isPending.value ? 'Uploading…' : 'Upload and sync' }}
      </Button>
    </div>

    <Alert v-if="missingActiveKinds.length" variant="warning">
      <TriangleAlert />
      <AlertTitle>No ACTIVE Timesheet snapshot</AlertTitle>
      <AlertDescription>
        No ACTIVE {{ missingActiveLabel }} Timesheet snapshot is available. Upload a report or wait
        for SharePoint auto-sync.
      </AlertDescription>
    </Alert>

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
        <CardTitle>Recent uploads</CardTitle>
        <CardDescription>
          History of Daily and Monthly uploads and SharePoint syncs, including failed and archived
          attempts.
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
            hasRunFilters ? 'No matching uploads.' : 'No uploads yet.'
          "
          table-class="min-w-[1180px]"
          :get-row-id="(row) => row.id"
        />

        <TablePager
          :total="total"
          :page="page"
          :page-size="pageSize"
          label="uploads"
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

    <TimesheetSyncIssuesDialog
      v-model:open="issuesOpen"
      :run-id="selectedRun?.id ?? null"
      :run="selectedRun"
    />
    <TimesheetSyncAlertDialog v-model:open="alertOpen" />
    <DomainHeadsDialog v-if="props.showCenterRoles" v-model:open="domainHeadOpen" />

  </div>
</template>
