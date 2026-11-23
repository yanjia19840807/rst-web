<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import ListLoading from '@/components/ListLoading.vue'
import TabStrip from '@/components/TabStrip.vue'
import TablePager from '@/components/TablePager.vue'
import TableTextLink from '@/components/TableTextLink.vue'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { triggerDownload } from '@/features/exercise-management/downloadBlob'
import { formatCivilDate } from '@/lib/datetime'
import {
  useTimesheetSnapshotKpisQuery,
  useTimesheetSnapshotOccupanciesQuery,
  useTimesheetSnapshotPeopleQuery,
  useTimesheetSnapshotPositionsQuery,
  useTimesheetSnapshotScopesQuery,
} from '@/features/timesheet-sync/api/queries'
import {
  createSnapshotKpiColumns,
  createSnapshotOccupancyColumns,
  createSnapshotPersonColumns,
  createSnapshotPositionColumns,
  createSnapshotScopeColumns,
} from '@/features/timesheet-sync/components/timesheetSnapshotColumns'
import '@/components/ui/data-table/types'

import { sourceDataApi } from '../api'
import { sourceKindLabel } from '../labels'
import {
  useCenterSourcesQuery,
  useCurrentSourceQuery,
  useSourceDeliveryHcQuery,
  useSourcePeopleQuery,
  useSourcePositionsQuery,
  useSourceProcessesQuery,
  useSourceSeatsQuery,
} from '../queries'
import type {
  SourceDeliveryHc,
  SourceFile,
  SourcePerson,
  SourcePosition,
  SourceProcess,
  SourceSeat,
} from '../types'

type TableTab = 'people' | 'positions' | 'seats' | 'process' | 'hc'

const props = withDefaults(defineProps<{ lockCenter?: string }>(), { lockCenter: '' })

const centersQuery = useCenterSourcesQuery()
const center = ref('')
const q = ref('')
const tab = ref<TableTab>('people')
const page = ref(1)
const pageSize = ref(10)

watch(
  () => [props.lockCenter, centersQuery.data.value] as const,
  ([locked, rows]) => {
    if (locked) {
      center.value = locked
      return
    }
    if (!center.value && rows?.length) center.value = rows[0]?.center ?? ''
  },
  { immediate: true },
)

watch([center, q, tab], () => {
  page.value = 1
})

const currentQuery = useCurrentSourceQuery(center)
const mode = computed(() => currentQuery.data.value?.mode)
const isTimesheet = computed(() => mode.value === 'TIMESHEET')
const isInterim = computed(() => mode.value === 'MYHR_SKPI')
const files = computed(() => currentQuery.data.value?.files ?? [])
const tableQuery = computed(() => ({
  center: center.value,
  q: q.value.trim() || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const scopeQuery = computed(() => ({
  center: center.value || undefined,
  pl3Code: q.value.trim() || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const timesheetPeople = useTimesheetSnapshotPeopleQuery(
  tableQuery,
  () => isTimesheet.value && tab.value === 'people',
)
const timesheetPositions = useTimesheetSnapshotPositionsQuery(
  tableQuery,
  () => isTimesheet.value && tab.value === 'positions',
)
const timesheetSeats = useTimesheetSnapshotOccupanciesQuery(
  tableQuery,
  () => isTimesheet.value && tab.value === 'seats',
)
const timesheetScopes = useTimesheetSnapshotScopesQuery(
  scopeQuery,
  () => isTimesheet.value && tab.value === 'process',
)
const timesheetKpis = useTimesheetSnapshotKpisQuery(
  scopeQuery,
  () => isTimesheet.value && tab.value === 'hc',
)
const interimPeople = useSourcePeopleQuery(
  tableQuery,
  () => isInterim.value && tab.value === 'people',
)
const interimPositions = useSourcePositionsQuery(
  tableQuery,
  () => isInterim.value && tab.value === 'positions',
)
const interimSeats = useSourceSeatsQuery(tableQuery, () => isInterim.value && tab.value === 'seats')
const interimProcesses = useSourceProcessesQuery(
  tableQuery,
  () => isInterim.value && tab.value === 'process',
)
const interimHc = useSourceDeliveryHcQuery(tableQuery, () => isInterim.value && tab.value === 'hc')

const activePage = computed(() => {
  if (isTimesheet.value) {
    if (tab.value === 'people') return timesheetPeople.data.value
    if (tab.value === 'positions') return timesheetPositions.data.value
    if (tab.value === 'seats') return timesheetSeats.data.value
    if (tab.value === 'process') return timesheetScopes.data.value
    return timesheetKpis.data.value
  }
  if (tab.value === 'people') return interimPeople.data.value
  if (tab.value === 'positions') return interimPositions.data.value
  if (tab.value === 'seats') return interimSeats.data.value
  if (tab.value === 'process') return interimProcesses.data.value
  return interimHc.data.value
})
const pending = computed(() => {
  if (!center.value || currentQuery.isPending.value) return true
  if (isTimesheet.value) {
    if (tab.value === 'people') return timesheetPeople.isPending.value
    if (tab.value === 'positions') return timesheetPositions.isPending.value
    if (tab.value === 'seats') return timesheetSeats.isPending.value
    if (tab.value === 'process') return timesheetScopes.isPending.value
    return timesheetKpis.isPending.value
  }
  if (tab.value === 'people') return interimPeople.isPending.value
  if (tab.value === 'positions') return interimPositions.isPending.value
  if (tab.value === 'seats') return interimSeats.isPending.value
  if (tab.value === 'process') return interimProcesses.isPending.value
  return interimHc.isPending.value
})

const personColumns = createSnapshotPersonColumns()
const positionColumns = createSnapshotPositionColumns()
const seatColumns = createSnapshotOccupancyColumns()
const scopeColumns = createSnapshotScopeColumns()
const kpiColumns = createSnapshotKpiColumns()

function dash(value: string | number | null | undefined) {
  if (value == null || value === '') return '—'
  return String(value)
}

const personHelper = createColumnHelper<SourcePerson>()
const seatHelper = createColumnHelper<SourceSeat>()
const positionHelper = createColumnHelper<SourcePosition>()
const processHelper = createColumnHelper<SourceProcess>()
const hcHelper = createColumnHelper<SourceDeliveryHc>()

const interimPersonColumns: ColumnDef<SourcePerson>[] = [
  personHelper.accessor('ccgid', { header: 'CCGID' }),
  personHelper.accessor('name', { header: 'Name' }),
  personHelper.accessor((row) => dash(row.jobRole), { id: 'jobRole', header: 'Job role' }),
  personHelper.accessor((row) => dash(row.positionId), { id: 'positionId', header: 'Position' }),
  personHelper.accessor((row) => dash(row.roleType), { id: 'roleType', header: 'Role' }),
]
const interimSeatColumns: ColumnDef<SourceSeat>[] = [
  seatHelper.accessor('ccgid', { header: 'CCGID' }),
  seatHelper.accessor('name', { header: 'Name' }),
  seatHelper.accessor((row) => dash(row.positionId), { id: 'positionId', header: 'Position' }),
  seatHelper.accessor((row) => dash(row.roleType), { id: 'roleType', header: 'Role' }),
]
const interimPositionColumns: ColumnDef<SourcePosition>[] = [
  positionHelper.accessor((row) => dash(row.positionId), { id: 'positionId', header: 'Position' }),
  positionHelper.accessor((row) => dash(row.roleType), { id: 'roleType', header: 'Role' }),
  positionHelper.accessor((row) => dash(row.parentPositionId), {
    id: 'parentPositionId',
    header: 'Parent position',
  }),
  positionHelper.accessor((row) => dash(row.parentRoleType), {
    id: 'parentRoleType',
    header: 'Parent role',
  }),
]
const interimProcessColumns: ColumnDef<SourceProcess>[] = [
  processHelper.accessor((row) => dash(row.domain), { id: 'domain', header: 'Domain' }),
  processHelper.accessor((row) => dash(row.pl1), { id: 'pl1', header: 'PL1' }),
  processHelper.accessor((row) => dash(row.pl2), { id: 'pl2', header: 'PL2' }),
  processHelper.accessor('pl3Code', { header: 'PL3 code' }),
  processHelper.accessor((row) => dash(row.pl3Name), { id: 'pl3Name', header: 'PL3' }),
]
const interimHcColumns: ColumnDef<SourceDeliveryHc>[] = [
  hcHelper.accessor('pl3Code', { header: 'PL3 code' }),
  hcHelper.accessor('carrier', { header: 'Carrier' }),
  hcHelper.accessor('site', { header: 'Site' }),
  hcHelper.accessor('customerCountry', { header: 'Country' }),
  hcHelper.accessor((row) => dash(row.hc), { id: 'hc', header: 'Delivery HC' }),
]

const tabs = [
  { key: 'people' as const, label: 'People' },
  { key: 'positions' as const, label: 'Positions' },
  { key: 'seats' as const, label: 'Incumbents' },
  { key: 'process' as const, label: 'Process' },
  { key: 'hc' as const, label: 'Delivery HC' },
]

function fileDate(file: SourceFile) {
  if (file.period) return file.period
  return file.syncDate ? formatCivilDate(file.syncDate) : ''
}

const downloadingId = ref<string | null>(null)

async function download(file: SourceFile) {
  if (!file.id || !file.hasSourceFile || downloadingId.value === file.id) return
  downloadingId.value = file.id
  try {
    const result = await sourceDataApi.download(file.id, file.sourceFileName || 'source.xlsx')
    triggerDownload(result.blob, result.filename)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'File is no longer available.')
  } finally {
    if (downloadingId.value === file.id) downloadingId.value = null
  }
}
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <label class="grid gap-1.5 text-sm">
        <span class="text-muted-foreground">Center</span>
        <div v-if="lockCenter" class="font-medium">{{ lockCenter }}</div>
        <NativeSelect
          v-else
          :model-value="center"
          class="w-[240px]"
          @update:model-value="center = String($event ?? '')"
        >
          <option value="">Select center</option>
          <option v-for="item in centersQuery.data.value ?? []" :key="item.center" :value="item.center">
            {{ item.center }}
          </option>
        </NativeSelect>
      </label>
      <Input v-model="q" placeholder="Search" class="max-w-xs" />
    </div>

    <ListLoading v-if="centersQuery.isPending.value && !center" />
    <p v-else-if="!center" class="text-sm text-muted-foreground">Select a center.</p>
    <template v-else>
      <div class="grid gap-2 rounded-lg border bg-card px-4 py-3">
        <p class="text-sm text-muted-foreground">
          <template v-if="isTimesheet">
            People, positions, and incumbents come from the current Daily file. Process and Delivery HC
            come from the current Monthly file.
          </template>
          <template v-else-if="isInterim">
            People, positions, and incumbents come from the current MyHR file. Process and Delivery HC
            come from the current SKPI file.
          </template>
        </p>
        <div
          v-for="file in files"
          v-show="!lockCenter || isTimesheet"
          :key="file.kind"
          class="flex flex-wrap items-baseline gap-x-3 text-sm"
        >
          <span class="w-20 font-medium">{{ sourceKindLabel[file.kind] ?? file.kind }}</span>
          <TableTextLink
            v-if="file.id && file.hasSourceFile && file.sourceFileName"
            :loading="downloadingId === file.id"
            @click="download(file)"
          >
            {{ file.sourceFileName }}
          </TableTextLink>
          <span v-else-if="file.sourceFileName">{{ file.sourceFileName }}</span>
          <span v-else class="text-muted-foreground">No current file</span>
          <span v-if="fileDate(file)" class="text-muted-foreground">{{ fileDate(file) }}</span>
        </div>
      </div>

      <TabStrip v-model="tab" :tabs="tabs" />

      <template v-if="isTimesheet">
        <DataTable
          v-if="tab === 'people'"
          :columns="personColumns"
          :data="timesheetPeople.data.value?.items ?? []"
          :pending="pending"
          empty-text="No people in the current Daily snapshot."
        />
        <DataTable
          v-else-if="tab === 'positions'"
          :columns="positionColumns"
          :data="timesheetPositions.data.value?.items ?? []"
          :pending="pending"
          empty-text="No positions in the current Daily snapshot."
        />
        <DataTable
          v-else-if="tab === 'seats'"
          :columns="seatColumns"
          :data="timesheetSeats.data.value?.items ?? []"
          :pending="pending"
          empty-text="No incumbents in the current Daily snapshot."
        />
        <DataTable
          v-else-if="tab === 'process'"
          :columns="scopeColumns"
          :data="timesheetScopes.data.value?.items ?? []"
          :pending="pending"
          empty-text="No process in the current Monthly snapshot."
        />
        <DataTable
          v-else
          :columns="kpiColumns"
          :data="timesheetKpis.data.value?.items ?? []"
          :pending="pending"
          empty-text="No Delivery HC in the current Monthly snapshot."
        />
      </template>
      <template v-else-if="isInterim">
        <DataTable
          v-if="tab === 'people'"
          :columns="interimPersonColumns"
          :data="interimPeople.data.value?.items ?? []"
          :pending="pending"
          empty-text="No people in the current MyHR snapshot."
        />
        <DataTable
          v-else-if="tab === 'positions'"
          :columns="interimPositionColumns"
          :data="interimPositions.data.value?.items ?? []"
          :pending="pending"
          empty-text="No positions in the current MyHR snapshot."
        />
        <DataTable
          v-else-if="tab === 'seats'"
          :columns="interimSeatColumns"
          :data="interimSeats.data.value?.items ?? []"
          :pending="pending"
          empty-text="No incumbents in the current MyHR snapshot."
        />
        <DataTable
          v-else-if="tab === 'process'"
          :columns="interimProcessColumns"
          :data="interimProcesses.data.value?.items ?? []"
          :pending="pending"
          empty-text="No process in the current SKPI snapshot."
        />
        <DataTable
          v-else
          :columns="interimHcColumns"
          :data="interimHc.data.value?.items ?? []"
          :pending="pending"
          empty-text="No Delivery HC in the current SKPI snapshot."
        />
      </template>

      <TablePager
        v-if="(activePage?.total ?? 0) > 0"
        :total="activePage?.total ?? 0"
        :page="page"
        :page-size="pageSize"
        label="rows"
        @update:page="page = $event"
        @update:page-size="
          (size) => {
            pageSize = size
            page = 1
          }
        "
      />
    </template>
  </div>
</template>
