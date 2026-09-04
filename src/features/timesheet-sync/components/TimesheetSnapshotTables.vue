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
  useTimesheetSnapshotFiltersQuery,
  useTimesheetSnapshotKpisQuery,
  useTimesheetSnapshotPeopleQuery,
  useTimesheetSnapshotPositionsQuery,
  useTimesheetSnapshotScopesQuery,
} from '../api/queries'
import type { TimesheetSnapshotTab } from '../types'
import {
  createSnapshotKpiColumns,
  createSnapshotPersonColumns,
  createSnapshotPositionColumns,
  createSnapshotScopeColumns,
} from './timesheetSnapshotColumns'

const props = defineProps<{
  kind: 'DAILY' | 'MONTHLY'
  initialTab: TimesheetSnapshotTab
}>()

const allTabs: Array<{ key: TimesheetSnapshotTab; label: string; kind: 'DAILY' | 'MONTHLY' }> = [
  { key: 'people', label: 'People', kind: 'DAILY' },
  { key: 'positions', label: 'Positions', kind: 'DAILY' },
  { key: 'scopes', label: 'Process', kind: 'MONTHLY' },
  { key: 'kpis', label: 'Delivery HC', kind: 'MONTHLY' },
]

const descriptions: Record<TimesheetSnapshotTab, string> = {
  people: 'ACTIVE Daily identities. Search name, CCGID, emp ID, email or position.',
  positions: 'ACTIVE Daily org tree. Search Agent, Supervisor or SR Manager by position ID or name, and Center.',
  scopes: 'ACTIVE Monthly process coverage. Filter Supervisor, PL3 and Center.',
  kpis: 'ACTIVE Monthly Delivery HC. Filter Supervisor, PL3 and Center.',
}

const open = defineModel<boolean>('open', { default: false })
const tabs = computed(() => allTabs.filter((tab) => tab.kind === props.kind))
const title = computed(() =>
  props.kind === 'DAILY' ? 'Daily mapped tables' : 'Monthly mapped tables',
)
const subtitle = computed(() =>
  props.kind === 'DAILY'
    ? 'People and Positions from the ACTIVE Daily snapshot.'
    : 'Process and Delivery HC from the ACTIVE Monthly snapshot.',
)

const selectClass = 'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

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
const peopleCenter = ref('')
const scopeCenter = ref('')
const draftPl3Code = ref('')
const pl3Code = ref('')
const draftSupervisor = ref('')
const supervisor = ref('')

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
const kpisQuery = computed(() => ({
  center: scopeCenter.value || undefined,
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
  scopes: scopesResult,
  kpis: kpisResult,
}

const columns = {
  people: createSnapshotPersonColumns(),
  positions: createSnapshotPositionColumns(),
  scopes: createSnapshotScopeColumns(),
  kpis: createSnapshotKpiColumns(),
}

const pagerLabels: Record<TimesheetSnapshotTab, string> = {
  people: 'people',
  positions: 'positions',
  scopes: 'processes',
  kpis: 'Delivery HC rows',
}

const searchPlaceholders: Record<TimesheetSnapshotTab, string> = {
  people: 'Name, CCGID, emp ID, email or position',
  positions: 'Position ID or name on Agent, Supervisor or SR Manager',
  scopes: 'PL3, supervisor ID or name, PL1, PL2',
  kpis: 'Carrier, site or country',
}

const tableClasses: Record<TimesheetSnapshotTab, string> = {
  people: 'min-w-[960px]',
  positions: 'min-w-[1200px]',
  scopes: 'min-w-[1080px]',
  kpis: 'min-w-[1080px]',
}

const activeResult = computed(() => results[resolvedTab.value])
const rows = computed(() => activeResult.value.data.value?.items ?? [])
const total = computed(() => activeResult.value.data.value?.total ?? 0)
const loading = computed(
  () => activeResult.value.isPending.value && !activeResult.value.data.value,
)
const hasFilters = computed(() => {
  if (appliedQ.value) return true
  if (resolvedTab.value === 'people') return Boolean(peopleCenter.value)
  if (resolvedTab.value === 'positions') return Boolean(peopleCenter.value)
  if (resolvedTab.value === 'scopes') {
    return Boolean(scopeCenter.value || supervisor.value || pl3Code.value)
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
  draftSupervisor,
  (value) => {
    supervisor.value = value.trim()
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
          <TabStrip
            class="shrink-0"
            :tabs="tabs"
            :model-value="resolvedTab"
            @update:model-value="activeTab = $event"
          />

          <p class="shrink-0 text-sm text-muted-foreground">{{ descriptions[resolvedTab] }}</p>
          <div class="grid shrink-0 grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-end">
            <label
              v-if="resolvedTab === 'people' || resolvedTab === 'positions'"
              class="grid min-w-0 gap-1.5 text-xs text-muted-foreground"
            >
              Search
              <Input
                v-model="draftQ"
                class="w-full min-w-0 sm:w-[260px]"
                :placeholder="searchPlaceholders[resolvedTab]"
              />
            </label>
            <label
              v-if="resolvedTab === 'people' || resolvedTab === 'positions'"
              class="grid min-w-0 gap-1.5 text-xs text-muted-foreground"
            >
              Center
              <select v-model="peopleCenter" :class="[selectClass, 'w-full min-w-0 sm:w-[200px]']">
                <option value="">All centers</option>
                <option v-for="center in peopleCenters" :key="center" :value="center">{{ center }}</option>
              </select>
            </label>
            <template v-if="resolvedTab === 'scopes'">
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
            <template v-if="resolvedTab === 'kpis'">
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
            <label
              v-if="resolvedTab === 'scopes' || resolvedTab === 'kpis'"
              class="grid min-w-0 gap-1.5 text-xs text-muted-foreground"
            >
              Center
              <select v-model="scopeCenter" :class="[selectClass, 'w-full min-w-0 sm:w-[200px]']">
                <option value="">All centers</option>
                <option v-for="center in scopeCenters" :key="center" :value="center">{{ center }}</option>
              </select>
            </label>
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
