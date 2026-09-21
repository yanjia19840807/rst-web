<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

import TablePager from '@/components/TablePager.vue'
import TabStrip from '@/components/TabStrip.vue'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import {
  useTimesheetSnapshotKpisQuery,
  useTimesheetSnapshotOccupanciesQuery,
  useTimesheetSnapshotPeopleQuery,
  useTimesheetSnapshotPositionsQuery,
  useTimesheetSnapshotScopesQuery,
} from '../api/queries'
import type { TimesheetSnapshotTab } from '../types'
import {
  createSnapshotKpiColumns,
  createSnapshotOccupancyColumns,
  createSnapshotPersonColumns,
  createSnapshotPositionColumns,
  createSnapshotScopeColumns,
} from './timesheetSnapshotColumns'

const props = defineProps<{
  kind: 'DAILY' | 'MONTHLY'
  initialTab: TimesheetSnapshotTab
  center?: string
  fileDate?: string
}>()

const allTabs: Array<{ key: TimesheetSnapshotTab; label: string; kind: 'DAILY' | 'MONTHLY' }> = [
  { key: 'people', label: 'People', kind: 'DAILY' },
  { key: 'positions', label: 'Positions', kind: 'DAILY' },
  { key: 'occupancies', label: 'Occupancy', kind: 'DAILY' },
  { key: 'scopes', label: 'Process', kind: 'MONTHLY' },
  { key: 'kpis', label: 'Delivery HC', kind: 'MONTHLY' },
]

const descriptions: Record<TimesheetSnapshotTab, string> = {
  people: 'ACTIVE Daily identities. Search name, CCGID, emp ID, job role, email or occupied position.',
  positions: 'ACTIVE Daily position nodes. Search position, parent, role or occupant.',
  occupancies: 'ACTIVE Daily seats. Search name, CCGID, position or role.',
  scopes: 'ACTIVE Monthly process coverage. Filter Supervisor and PL3.',
  kpis: 'ACTIVE Monthly Delivery HC. Filter Supervisor and PL3.',
}

const open = defineModel<boolean>('open', { default: false })
const tabs = computed(() => allTabs.filter((tab) => tab.kind === props.kind))
const title = computed(() =>
  props.kind === 'DAILY' ? 'Daily mapped tables' : 'Monthly mapped tables',
)
const subtitle = computed(() =>
  props.kind === 'DAILY'
    ? 'People, Positions and Occupancy from the ACTIVE Daily snapshot.'
    : 'Process and Delivery HC from the ACTIVE Monthly snapshot.',
)


const activeTab = ref<TimesheetSnapshotTab>(props.initialTab)
const resolvedTab = computed<TimesheetSnapshotTab>(() => {
  const allowed = tabs.value.map((tab) => tab.key)
  if (allowed.includes(activeTab.value)) return activeTab.value
  if (allowed.includes(props.initialTab)) return props.initialTab
  return allowed[0] ?? 'people'
})
const draftQ = ref('')
const appliedQ = ref('')
const page = ref(1)
const pageSize = ref(10)
const draftPl3Code = ref('')
const pl3Code = ref('')
const draftSupervisor = ref('')
const supervisor = ref('')

const fileCenter = computed(() => props.center?.trim() || undefined)
const fileDate = computed(() => props.fileDate?.trim() || '')
const fileCenterLabel = computed(() => fileCenter.value || '—')
const fileDateLabel = computed(() => fileDate.value || '—')

const peopleQuery = computed(() => ({
  center: fileCenter.value,
  q: appliedQ.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const positionsQuery = computed(() => ({
  center: fileCenter.value,
  q: appliedQ.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const occupanciesQuery = computed(() => ({
  center: fileCenter.value,
  q: appliedQ.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const scopesQuery = computed(() => ({
  center: fileCenter.value,
  supervisor: supervisor.value || undefined,
  pl3Code: pl3Code.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const kpisQuery = computed(() => ({
  center: fileCenter.value,
  supervisor: supervisor.value || undefined,
  pl3Code: pl3Code.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const peopleResult = useTimesheetSnapshotPeopleQuery(
  peopleQuery,
  () => open.value && resolvedTab.value === 'people',
)
const positionsResult = useTimesheetSnapshotPositionsQuery(
  positionsQuery,
  () => open.value && resolvedTab.value === 'positions',
)
const occupanciesResult = useTimesheetSnapshotOccupanciesQuery(
  occupanciesQuery,
  () => open.value && resolvedTab.value === 'occupancies',
)
const scopesResult = useTimesheetSnapshotScopesQuery(
  scopesQuery,
  () => open.value && resolvedTab.value === 'scopes',
)
const kpisResult = useTimesheetSnapshotKpisQuery(
  kpisQuery,
  () => open.value && resolvedTab.value === 'kpis',
)

const results = {
  people: peopleResult,
  positions: positionsResult,
  occupancies: occupanciesResult,
  scopes: scopesResult,
  kpis: kpisResult,
}

const columns = {
  people: createSnapshotPersonColumns(),
  positions: createSnapshotPositionColumns(),
  occupancies: createSnapshotOccupancyColumns(),
  scopes: createSnapshotScopeColumns(),
  kpis: createSnapshotKpiColumns(),
}

const pagerLabels: Record<TimesheetSnapshotTab, string> = {
  people: 'people',
  positions: 'positions',
  occupancies: 'occupancies',
  scopes: 'processes',
  kpis: 'Delivery HC rows',
}

const searchPlaceholders: Record<TimesheetSnapshotTab, string> = {
  people: 'Name, CCGID, emp ID, job role, email or position',
  positions: 'Position, parent, role or occupant',
  occupancies: 'Name, CCGID, position or role',
  scopes: 'PL3, supervisor ID or name, PL1, PL2',
  kpis: 'Carrier, site or country',
}

const tableClasses: Record<TimesheetSnapshotTab, string> = {
  people: 'min-w-[880px]',
  positions: 'min-w-[960px]',
  occupancies: 'min-w-[760px]',
  scopes: 'min-w-[960px]',
  kpis: 'min-w-[960px]',
}

const activeResult = computed(() => results[resolvedTab.value])
const rows = computed(() => activeResult.value.data.value?.items ?? [])
const total = computed(() => activeResult.value.data.value?.total ?? 0)
const loading = computed(
  () => activeResult.value.isPending.value && !activeResult.value.data.value,
)
const hasFilters = computed(() => {
  if (appliedQ.value) return true
  if (resolvedTab.value === 'scopes' || resolvedTab.value === 'kpis') {
    return Boolean(supervisor.value || pl3Code.value)
  }
  return false
})

watchDebounced(
  draftQ,
  (value) => {
    appliedQ.value = value.trim()
    page.value = 1
  },
  { debounce: 400 },
)

watchDebounced(
  draftPl3Code,
  (value) => {
    pl3Code.value = value.trim()
    page.value = 1
  },
  { debounce: 400 },
)

watchDebounced(
  draftSupervisor,
  (value) => {
    supervisor.value = value.trim()
    page.value = 1
  },
  { debounce: 400 },
)

watch(activeTab, () => {
  draftQ.value = ''
  appliedQ.value = ''
  page.value = 1
  draftPl3Code.value = ''
  pl3Code.value = ''
  draftSupervisor.value = ''
  supervisor.value = ''
})

watch(
  () => [open.value, props.kind, props.initialTab] as const,
  ([isOpen, , tab]) => {
    if (!isOpen) return
    activeTab.value = tab
  },
  { immediate: true, flush: 'sync' },
)

watch(
  () => ({
    totalPages: activeResult.value.data.value?.totalPages,
    fetching: activeResult.value.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

function rowId(row: {
  ccgid?: string
  positionId?: string
  roleType?: string
  agentPositionId?: string
  supervisorPositionId?: string
  srManagerPositionId?: string
  pl3Code?: string
  center?: string
  carrier?: string
  site?: string
  customerCountry?: string
}) {
  return [
    row.ccgid,
    row.positionId,
    row.roleType,
    row.agentPositionId,
    row.supervisorPositionId,
    row.srManagerPositionId,
    row.pl3Code,
    row.center,
    row.carrier,
    row.site,
    row.customerCountry,
  ]
    .filter(Boolean)
    .join('|')
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[85vh] sm:max-h-[85vh] sm:max-w-6xl sm:rounded-xl"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-4 py-3 sm:px-5 sm:py-4">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ subtitle }}</DialogDescription>
      </DialogHeader>

      <div class="min-h-0 min-w-0 flex-1 overflow-hidden px-4 py-3 sm:px-5 sm:py-4">
        <div class="flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-lg border bg-card p-3 sm:gap-4 sm:p-4">
          <div class="flex shrink-0 flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
            <div class="grid gap-0.5">
              <span class="text-xs text-muted-foreground">Center</span>
              <span class="font-medium">{{ fileCenterLabel }}</span>
            </div>
            <div class="grid gap-0.5">
              <span class="text-xs text-muted-foreground">File date</span>
              <span class="font-medium">{{ fileDateLabel }}</span>
            </div>
          </div>

          <TabStrip
            class="shrink-0"
            :tabs="tabs"
            :model-value="resolvedTab"
            @update:model-value="activeTab = $event"
          />

          <p class="shrink-0 text-sm text-muted-foreground">{{ descriptions[resolvedTab] }}</p>
          <div class="grid shrink-0 grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-end">
            <label
              v-if="resolvedTab === 'people' || resolvedTab === 'positions' || resolvedTab === 'occupancies'"
              class="grid min-w-0 gap-1.5 text-xs text-muted-foreground"
            >
              Search
              <Input
                v-model="draftQ"
                class="w-full min-w-0 sm:w-[260px]"
                :placeholder="searchPlaceholders[resolvedTab]"
              />
            </label>
            <template v-if="resolvedTab === 'scopes' || resolvedTab === 'kpis'">
              <label class="grid min-w-0 gap-1.5 text-xs text-muted-foreground">
                Supervisor
                <Input
                  v-model="draftSupervisor"
                  class="w-full min-w-0 sm:w-[200px]"
                  placeholder="Position ID or name"
                />
              </label>
              <label class="grid min-w-0 gap-1.5 text-xs text-muted-foreground">
                PL3
                <Input
                  v-model="draftPl3Code"
                  class="w-full min-w-0 sm:w-[200px]"
                  placeholder="PL3 code or name"
                />
              </label>
            </template>
          </div>

          <div class="min-h-0 min-w-0 flex-1 overflow-auto">
            <DataTable
              :key="resolvedTab"
              :columns="columns[resolvedTab]"
              :data="rows"
              :pending="loading"
              :empty-text="
                hasFilters
                  ? 'No matching rows in the ACTIVE snapshot.'
                  : 'No ACTIVE snapshot rows yet.'
              "
              :table-class="tableClasses[resolvedTab]"
              :get-row-id="rowId"
            />
          </div>

          <TablePager
            class="mt-0 shrink-0"
            :total="total"
            :page="page"
            :page-size="pageSize"
            :label="pagerLabels[resolvedTab]"
            @update:page="page = $event"
            @update:page-size="
              (size) => {
                pageSize = size
                page = 1
              }
            "
          />
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-4 py-3 sm:px-5 sm:justify-end">
        <Button type="button" variant="outline" class="w-full sm:w-auto" @click="open = false">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
