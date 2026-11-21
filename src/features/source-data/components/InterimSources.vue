<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useQueryClient } from '@tanstack/vue-query'

import QueryPanel from '@/components/QueryPanel.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { triggerDownload } from '@/features/exercise-management/downloadBlob'
import TimesheetSyncFilterFields from '@/features/timesheet-sync/components/TimesheetSyncFilterFields.vue'
import TimesheetSyncIssuesDialog from '@/features/timesheet-sync/components/TimesheetSyncIssuesDialog.vue'
import {
  createInterimActiveColumns,
  createInterimUploadColumns,
} from '@/features/timesheet-sync/components/timesheetSyncColumns'
import { useTimesheetSyncOverviewQuery } from '@/features/timesheet-sync/api/queries'
import {
  emptyTimesheetSyncFilters,
  toSyncDateRange,
} from '@/features/timesheet-sync/timesheetSyncFilters'
import type { TimesheetSyncOverviewQuery, TimesheetSyncRunHeader } from '@/features/timesheet-sync/types'

import { sourceDataApi } from '../api'
import { sourceDataQueryKeys } from '../queries'
import { sourceKindLabel } from '../labels'
import SiteMappingDialog from './SiteMappingDialog.vue'

const interimKinds = [
  { value: 'MYHR', label: 'MyHR' },
  { value: 'SHARED_KPI', label: 'SKPI' },
]
const periodKinds = ['SHARED_KPI']

const queryClient = useQueryClient()
const draft = reactive(emptyTimesheetSyncFilters())
const applied = reactive(emptyTimesheetSyncFilters())
const page = ref(1)
const pageSize = ref(10)
const uploading = ref<'myhr' | 'skpi' | null>(null)
const siteOpen = ref(false)
const issuesOpen = ref(false)
const issuesRunId = ref<string | null>(null)
const myHrInput = ref<HTMLInputElement | null>(null)
const skpiInput = ref<HTMLInputElement | null>(null)

const activeQueries = interimKinds.map((option) =>
  useTimesheetSyncOverviewQuery(
    computed(() => ({
      kind: option.value,
      status: 'ACTIVE',
      page: 1,
      pageSize: 5,
    })),
  ),
)
const listQuery = computed<TimesheetSyncOverviewQuery>(() => {
  const dates = toSyncDateRange(applied, periodKinds)
  return {
    kind: applied.kind || 'INTERIM',
    status: applied.status || undefined,
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    page: page.value,
    pageSize: pageSize.value,
  }
})
const runsQuery = useTimesheetSyncOverviewQuery(listQuery)
const activeRows = computed(() => activeQueries.flatMap((query) => query.data.value?.runs.items ?? []))
const runs = computed(() => runsQuery.data.value?.runs.items ?? [])
const total = computed(() => runsQuery.data.value?.runs.total ?? 0)
const activeLoading = computed(() =>
  activeQueries.some((query) => query.isPending.value && !query.data.value),
)
const runsLoading = computed(() => runsQuery.isPending.value && !runsQuery.data.value)
const hasUploadFilters = computed(() =>
  Boolean(applied.kind || applied.status || applied.syncDateFrom || applied.syncDateTo),
)
const activeColumns = createInterimActiveColumns({
  onViewIssues: openIssues,
  onDownload: (row) => downloadRun(row),
})
const uploadColumns = createInterimUploadColumns({
  onViewIssues: openIssues,
  onDownload: (row) => downloadRun(row),
})

function openIssues(row: TimesheetSyncRunHeader) {
  issuesRunId.value = row.id
  issuesOpen.value = true
}

function openSite() {
  siteOpen.value = true
}

function applyUploads() {
  Object.assign(applied, { ...draft })
  page.value = 1
}

function clearUploads() {
  Object.assign(draft, emptyTimesheetSyncFilters())
  Object.assign(applied, emptyTimesheetSyncFilters())
  page.value = 1
}

async function downloadRun(row: TimesheetSyncRunHeader) {
  if (!row.hasSourceFile) return
  try {
    const result = await sourceDataApi.download(row.id, row.sourceFileName || 'source.xlsx')
    triggerDownload(result.blob, result.filename)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'File is no longer available.')
  }
}

async function onFile(kindName: 'myhr' | 'skpi', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || uploading.value) return
  uploading.value = kindName
  try {
    const result = await sourceDataApi.upload(kindName, file)
    await queryClient.invalidateQueries({ queryKey: sourceDataQueryKeys.all })
    await queryClient.invalidateQueries({ queryKey: ['timesheet-sync'] })
    page.value = 1
    const issues = result.issueCount
    toast.success(
      issues > 0
        ? `Imported ${sourceKindLabel[result.kind] ?? result.kind}. ${issues} row issue${issues === 1 ? '' : 's'} recorded.`
        : `Imported ${sourceKindLabel[result.kind] ?? result.kind}.`,
    )
    if (issues > 0) {
      issuesRunId.value = result.id
      issuesOpen.value = true
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Upload failed.')
  } finally {
    uploading.value = null
  }
}

</script>

<template>
  <div class="grid min-w-0 gap-4">
    <div class="flex flex-wrap items-center justify-end gap-2">
      <input ref="myHrInput" type="file" accept=".xlsx" class="hidden" @change="onFile('myhr', $event)" />
      <input ref="skpiInput" type="file" accept=".xlsx" class="hidden" @change="onFile('skpi', $event)" />
      <Button variant="outline" @click="openSite()">Site mapping</Button>
      <Button variant="outline" :loading="uploading === 'myhr'" @click="myHrInput?.click()">
        Upload MyHR
      </Button>
      <Button variant="outline" :loading="uploading === 'skpi'" @click="skpiInput?.click()">
        Upload SKPI
      </Button>
    </div>

    <Card>
      <CardHeader>
        <div>
          <CardTitle>ACTIVE snapshots</CardTitle>
          <CardDescription>
            Latest successful MyHR and SKPI snapshot. A new success replaces the current file
            and keeps the previous rows.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        <DataTable
          :columns="activeColumns"
          :data="activeRows"
          :pending="activeLoading"
          empty-text="No ACTIVE snapshots."
          table-class="min-w-[980px]"
          :get-row-id="(row) => row.id"
        />
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader>
        <div>
          <CardTitle>Recent uploads</CardTitle>
          <CardDescription>
            History of MyHR and SKPI uploads, including failed attempts.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        <QueryPanel title="Filters" @search="applyUploads" @clear="clearUploads">
          <TimesheetSyncFilterFields
            :draft="draft"
            :show-center="false"
            :show-source="false"
            show-status
            :kind-options="interimKinds"
            :period-kinds="periodKinds"
          />
        </QueryPanel>
        <DataTable
          :columns="uploadColumns"
          :data="runs"
          :pending="runsLoading"
          :empty-text="hasUploadFilters ? 'No matching uploads.' : 'No uploads yet.'"
          table-class="min-w-[980px]"
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

    <SiteMappingDialog v-model:open="siteOpen" />
    <TimesheetSyncIssuesDialog v-model:open="issuesOpen" :run-id="issuesRunId" />
  </div>
</template>
