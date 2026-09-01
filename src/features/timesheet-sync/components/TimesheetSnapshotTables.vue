<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

import TablePager from '@/components/TablePager.vue'
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
  useTimesheetSnapshotAssignmentsQuery,
  useTimesheetSnapshotFiltersQuery,
  useTimesheetSnapshotKpisQuery,
  useTimesheetSnapshotPeopleQuery,
  useTimesheetSnapshotPositionsQuery,
  useTimesheetSnapshotScopesQuery,
} from '../api/queries'
import type { TimesheetSnapshotTab } from '../types'
import {
  createSnapshotAssignmentColumns,
  createSnapshotKpiColumns,
  createSnapshotPersonColumns,
  createSnapshotPositionColumns,
  createSnapshotScopeColumns,
} from './timesheetSnapshotColumns'

const tabs: Array<{ key: TimesheetSnapshotTab; label: string; kind: 'Daily' | 'Monthly' }> = [
  { key: 'people', label: 'People', kind: 'Daily' },
  { key: 'positions', label: 'Positions', kind: 'Daily' },
  { key: 'scopes', label: 'Scopes', kind: 'Monthly' },
  { key: 'assignments', label: 'Assignments', kind: 'Monthly' },
  { key: 'kpis', label: 'Delivery HC', kind: 'Monthly' },
]

const descriptions: Record<TimesheetSnapshotTab, string> = {
  people: 'ACTIVE Daily identities. Search name, CCGID, emp ID, email or position.',
  positions: 'ACTIVE Daily org tree. Search any level by position ID or name, and Center.',
  scopes: 'ACTIVE Monthly Toolkit scopes. Filter Supervisor, PL3 and Center.',
  assignments: 'ACTIVE Monthly seat-to-scope assignments. Filter Agent, Supervisor, PL3 and Center.',
  kpis: 'ACTIVE Monthly Delivery HC. Filter Supervisor, PL3 and Center.',
}

const open = defineModel<boolean>('open', { default: false })

const selectClass = 'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const activeTab = ref<TimesheetSnapshotTab>('people')
const draftQ = ref('')
const appliedQ = ref('')
const page = ref(1)
const pageSize = ref(10)
const peopleCenter = ref('')
const scopeCenter = ref('')
const draftPl3Code = ref('')
const pl3Code = ref('')
const draftAgent = ref('')
const draftSupervisor = ref('')
const draftSrManager = ref('')
const draftDomainHead = ref('')
const agent = ref('')
const supervisor = ref('')
const srManager = ref('')
const domainHead = ref('')

const filtersQuery = useTimesheetSnapshotFiltersQuery(() => open.value)
const peopleCenters = computed(() => filtersQuery.data.value?.peopleCenters ?? [])
const scopeCenters = computed(() => filtersQuery.data.value?.scopeCenters ?? [])

const peopleQuery = computed(() => ({
  center: peopleCenter.value || undefined,
  q: appliedQ.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const positionsQuery = computed(() => ({
  center: peopleCenter.value || undefined,
  q: appliedQ.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const scopesQuery = computed(() => ({
  center: scopeCenter.value || undefined,
  supervisor: supervisor.value || undefined,
  pl3Code: pl3Code.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const assignmentsQuery = computed(() => ({
  center: scopeCenter.value || undefined,
  agent: agent.value || undefined,
  supervisor: supervisor.value || undefined,
  pl3Code: pl3Code.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const kpisQuery = computed(() => ({
  center: scopeCenter.value || undefined,
  supervisor: supervisor.value || undefined,
  pl3Code: pl3Code.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const peopleResult = useTimesheetSnapshotPeopleQuery(
  peopleQuery,
  () => open.value && activeTab.value === 'people',
)
const positionsResult = useTimesheetSnapshotPositionsQuery(
  positionsQuery,
  () => open.value && activeTab.value === 'positions',
)
const scopesResult = useTimesheetSnapshotScopesQuery(
  scopesQuery,
  () => open.value && activeTab.value === 'scopes',
)
const assignmentsResult = useTimesheetSnapshotAssignmentsQuery(
  assignmentsQuery,
  () => open.value && activeTab.value === 'assignments',
)
const kpisResult = useTimesheetSnapshotKpisQuery(
  kpisQuery,
  () => open.value && activeTab.value === 'kpis',
)

const results = {
  people: peopleResult,
  positions: positionsResult,
  scopes: scopesResult,
  assignments: assignmentsResult,
  kpis: kpisResult,
}

const columns = {
  people: createSnapshotPersonColumns(),
  positions: createSnapshotPositionColumns(),
  scopes: createSnapshotScopeColumns(),
  assignments: createSnapshotAssignmentColumns(),
  kpis: createSnapshotKpiColumns(),
}

const pagerLabels: Record<TimesheetSnapshotTab, string> = {
  people: 'people',
  positions: 'positions',
  scopes: 'scopes',
  assignments: 'assignments',
  kpis: 'Delivery HC rows',
}

const searchPlaceholders: Record<TimesheetSnapshotTab, string> = {
  people: 'Name, CCGID, emp ID, email or position',
  positions: 'Position ID or name on any level',
  scopes: 'PL3, supervisor ID or name, PL1, PL2',
  assignments: 'CCGID or emp ID',
  kpis: 'Carrier, site or country',
}

const tableClasses: Record<TimesheetSnapshotTab, string> = {
  people: 'min-w-[960px]',
  positions: 'min-w-[1200px]',
  scopes: 'min-w-[1080px]',
  assignments: 'min-w-[1080px]',
  kpis: 'min-w-[1080px]',
}

const activeResult = computed(() => results[activeTab.value])
const rows = computed(() => activeResult.value.data.value?.items ?? [])
const total = computed(() => activeResult.value.data.value?.total ?? 0)
const loading = computed(
  () => activeResult.value.isPending.value && !activeResult.value.data.value,
)
const hasFilters = computed(() => {
  if (appliedQ.value) return true
  if (activeTab.value === 'people') return Boolean(peopleCenter.value)
  if (activeTab.value === 'positions') return Boolean(peopleCenter.value)
  if (activeTab.value === 'scopes') {
    return Boolean(scopeCenter.value || supervisor.value || pl3Code.value)
  }
  if (activeTab.value === 'assignments') {
    return Boolean(scopeCenter.value || agent.value || supervisor.value || pl3Code.value)
  }
  return Boolean(scopeCenter.value || supervisor.value || pl3Code.value)
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
  [draftAgent, draftSupervisor, draftSrManager, draftDomainHead],
  ([nextAgent, nextSupervisor, nextSrManager, nextDomainHead]) => {
    agent.value = nextAgent.trim()
    supervisor.value = nextSupervisor.trim()
    srManager.value = nextSrManager.trim()
    domainHead.value = nextDomainHead.trim()
    page.value = 1
  },
  { debounce: 400 },
)

watch([peopleCenter, scopeCenter], () => {
  page.value = 1
})

watch(activeTab, () => {
  draftQ.value = ''
  appliedQ.value = ''
  page.value = 1
  peopleCenter.value = ''
  scopeCenter.value = ''
  draftPl3Code.value = ''
  pl3Code.value = ''
  draftAgent.value = ''
  draftSupervisor.value = ''
  draftSrManager.value = ''
  draftDomainHead.value = ''
  agent.value = ''
  supervisor.value = ''
  srManager.value = ''
  domainHead.value = ''
})

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
  agentPositionId?: string
  supervisorPositionId?: string
  srManagerPositionId?: string
  domainHeadPositionId?: string
  pl3Code?: string
  center?: string
  carrier?: string
  site?: string
  customerCountry?: string
}) {
  return [
    row.ccgid,
    row.positionId,
    row.agentPositionId,
    row.supervisorPositionId,
    row.srManagerPositionId,
    row.domainHeadPositionId,
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
    <DialogContent class="flex h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-5 py-4">
        <DialogTitle>Mapped tables</DialogTitle>
        <DialogDescription>
          Rows computed from the current ACTIVE Daily and Monthly snapshots.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-hidden px-5 py-4">
        <div class="flex h-full min-h-0 flex-col gap-4 rounded-lg border bg-card p-4">
          <div class="flex shrink-0 gap-1 border-b">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              class="border-b-2 px-3.5 py-2 text-sm transition-colors"
              :class="
                activeTab === tab.key
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
              <span class="ml-1 text-xs font-normal text-muted-foreground">{{ tab.kind }}</span>
            </button>
          </div>

          <p class="shrink-0 text-sm text-muted-foreground">{{ descriptions[activeTab] }}</p>
          <div class="flex shrink-0 flex-wrap items-end gap-2.5">
            <label
              v-if="activeTab === 'people' || activeTab === 'positions'"
              class="grid gap-1.5 text-xs text-muted-foreground"
            >
              Search
              <Input v-model="draftQ" class="w-[260px]" :placeholder="searchPlaceholders[activeTab]" />
            </label>
            <label
              v-if="activeTab === 'people' || activeTab === 'positions'"
              class="grid gap-1.5 text-xs text-muted-foreground"
            >
              Center
              <select v-model="peopleCenter" :class="[selectClass, 'w-[200px]']">
                <option value="">All centers</option>
                <option v-for="center in peopleCenters" :key="center" :value="center">{{ center }}</option>
              </select>
            </label>
            <template v-if="activeTab === 'scopes'">
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                Supervisor
                <Input v-model="draftSupervisor" class="w-[200px]" placeholder="Position ID or name" />
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                PL3
                <Input v-model="draftPl3Code" class="w-[200px]" placeholder="PL3 code or name" />
              </label>
            </template>
            <template v-if="activeTab === 'assignments'">
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                Agent
                <Input v-model="draftAgent" class="w-[200px]" placeholder="Position ID or name" />
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                Supervisor
                <Input v-model="draftSupervisor" class="w-[200px]" placeholder="Position ID or name" />
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                PL3
                <Input v-model="draftPl3Code" class="w-[200px]" placeholder="PL3 code or name" />
              </label>
            </template>
            <template v-if="activeTab === 'kpis'">
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                Supervisor
                <Input v-model="draftSupervisor" class="w-[200px]" placeholder="Position ID or name" />
              </label>
              <label class="grid gap-1.5 text-xs text-muted-foreground">
                PL3
                <Input v-model="draftPl3Code" class="w-[200px]" placeholder="PL3 code or name" />
              </label>
            </template>
            <label
              v-if="activeTab === 'scopes' || activeTab === 'assignments' || activeTab === 'kpis'"
              class="grid gap-1.5 text-xs text-muted-foreground"
            >
              Center
              <select v-model="scopeCenter" :class="[selectClass, 'w-[200px]']">
                <option value="">All centers</option>
                <option v-for="center in scopeCenters" :key="center" :value="center">{{ center }}</option>
              </select>
            </label>
          </div>

          <div class="min-h-0 flex-1 overflow-auto">
            <DataTable
              :key="activeTab"
              :columns="columns[activeTab]"
              :data="rows"
              :pending="loading"
              :empty-text="
                hasFilters
                  ? 'No matching rows in the ACTIVE snapshot.'
                  : 'No ACTIVE snapshot rows yet.'
              "
              :table-class="tableClasses[activeTab]"
              :get-row-id="rowId"
            />
          </div>

          <TablePager
            class="mt-0 shrink-0"
            :total="total"
            :page="page"
            :page-size="pageSize"
            :label="pagerLabels[activeTab]"
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

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3 sm:justify-end">
        <Button type="button" variant="outline" @click="open = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
