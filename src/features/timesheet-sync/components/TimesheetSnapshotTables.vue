<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

import TablePager from '@/components/TablePager.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
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
  people: 'ACTIVE Daily identities. Search name, CCGID, emp ID or email.',
  positions: 'ACTIVE Daily org tree. One row per Agent seat with the parent chain.',
  scopes: 'ACTIVE Monthly Toolkit scopes (supervisor × center × PL3).',
  assignments: 'ACTIVE Monthly person-to-scope assignments.',
  kpis: 'ACTIVE Monthly Delivery HC by carrier, site and country.',
}

const selectClass = 'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const activeTab = ref<TimesheetSnapshotTab>('people')
const draftQ = ref('')
const appliedQ = ref('')
const page = ref(1)
const pageSize = ref(10)
const peopleCenter = ref('')
const scopeCenter = ref('')
const scopeDomain = ref('')
const draftSupervisorPositionId = ref('')
const draftPl3Code = ref('')
const supervisorPositionId = ref('')
const pl3Code = ref('')

const filtersQuery = useTimesheetSnapshotFiltersQuery()
const peopleCenters = computed(() => filtersQuery.data.value?.peopleCenters ?? [])
const scopeCenters = computed(() => filtersQuery.data.value?.scopeCenters ?? [])
const scopeDomains = computed(() => filtersQuery.data.value?.scopeDomains ?? [])

const peopleQuery = computed(() => ({
  center: peopleCenter.value || undefined,
  q: appliedQ.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const positionsQuery = computed(() => ({
  q: appliedQ.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const scopesQuery = computed(() => ({
  center: scopeCenter.value || undefined,
  domain: scopeDomain.value || undefined,
  q: appliedQ.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const assignmentsQuery = computed(() => ({
  supervisorPositionId: supervisorPositionId.value || undefined,
  pl3Code: pl3Code.value || undefined,
  q: appliedQ.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))
const kpisQuery = computed(() => ({
  supervisorPositionId: supervisorPositionId.value || undefined,
  pl3Code: pl3Code.value || undefined,
  q: appliedQ.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const peopleResult = useTimesheetSnapshotPeopleQuery(peopleQuery, () => activeTab.value === 'people')
const positionsResult = useTimesheetSnapshotPositionsQuery(
  positionsQuery,
  () => activeTab.value === 'positions',
)
const scopesResult = useTimesheetSnapshotScopesQuery(scopesQuery, () => activeTab.value === 'scopes')
const assignmentsResult = useTimesheetSnapshotAssignmentsQuery(
  assignmentsQuery,
  () => activeTab.value === 'assignments',
)
const kpisResult = useTimesheetSnapshotKpisQuery(kpisQuery, () => activeTab.value === 'kpis')

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
  people: 'Name, CCGID, emp ID, email',
  positions: 'Agent, supervisor, SR Manager or Domain Head ID',
  scopes: 'PL3, supervisor, PL1, PL2',
  assignments: 'CCGID or emp ID',
  kpis: 'Carrier, site or country',
}

const tableClasses: Record<TimesheetSnapshotTab, string> = {
  people: 'min-w-[960px]',
  positions: 'min-w-[960px]',
  scopes: 'min-w-[1080px]',
  assignments: 'min-w-[800px]',
  kpis: 'min-w-[960px]',
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
  if (activeTab.value === 'scopes') return Boolean(scopeCenter.value || scopeDomain.value)
  return Boolean(supervisorPositionId.value || pl3Code.value)
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
  draftSupervisorPositionId,
  (value) => {
    supervisorPositionId.value = value.trim()
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

watch([peopleCenter, scopeCenter, scopeDomain], () => {
  page.value = 1
})

watch(activeTab, () => {
  draftQ.value = ''
  appliedQ.value = ''
  page.value = 1
  peopleCenter.value = ''
  scopeCenter.value = ''
  scopeDomain.value = ''
  draftSupervisorPositionId.value = ''
  draftPl3Code.value = ''
  supervisorPositionId.value = ''
  pl3Code.value = ''
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
  empCcgid?: string
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
    row.empCcgid,
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
  <Card class="mt-4">
    <CardHeader class="gap-3">
      <div>
        <CardTitle>Mapped tables</CardTitle>
        <CardDescription>
          Rows computed from the current ACTIVE Daily and Monthly snapshots.
        </CardDescription>
      </div>
      <div class="flex gap-1 border-b">
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
    </CardHeader>
    <CardContent class="space-y-3">
      <p class="text-sm text-muted-foreground">{{ descriptions[activeTab] }}</p>
      <div class="flex flex-wrap items-end gap-2.5">
        <label class="grid gap-1.5 text-xs text-muted-foreground">
          Search
          <Input v-model="draftQ" class="w-[260px]" :placeholder="searchPlaceholders[activeTab]" />
        </label>
        <label v-if="activeTab === 'people'" class="grid gap-1.5 text-xs text-muted-foreground">
          Center
          <select v-model="peopleCenter" :class="[selectClass, 'w-[200px]']">
            <option value="">All centers</option>
            <option v-for="center in peopleCenters" :key="center" :value="center">{{ center }}</option>
          </select>
        </label>
        <template v-if="activeTab === 'scopes'">
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Center
            <select v-model="scopeCenter" :class="[selectClass, 'w-[200px]']">
              <option value="">All centers</option>
              <option v-for="center in scopeCenters" :key="center" :value="center">{{ center }}</option>
            </select>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Domain
            <select v-model="scopeDomain" :class="[selectClass, 'w-[200px]']">
              <option value="">All domains</option>
              <option v-for="domain in scopeDomains" :key="domain" :value="domain">{{ domain }}</option>
            </select>
          </label>
        </template>
        <template v-if="activeTab === 'assignments' || activeTab === 'kpis'">
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Supervisor position
            <Input
              v-model="draftSupervisorPositionId"
              class="w-[200px]"
              placeholder="Exact position ID"
            />
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            PL3 code
            <Input v-model="draftPl3Code" class="w-[160px]" placeholder="Exact PL3" />
          </label>
        </template>
      </div>

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

      <TablePager
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
    </CardContent>
  </Card>
</template>
