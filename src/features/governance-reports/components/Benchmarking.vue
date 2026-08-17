<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useBenchmarkingQuery } from '../api/queries'
import type { BenchmarkingQuery } from '../types'
import CapacityCell from './CapacityCell.vue'
import FilterField from './FilterField.vue'
import MetricCard from './MetricCard.vue'

const gbsFilter = ref('All')
const domainFilter = ref('All')
const pl1Filter = ref('All')
const pl2Filter = ref('All')
const pl3Filter = ref('All')
const submittedFrom = ref('')
const submittedTo = ref('')
const draftSubmittedFrom = ref('')
const draftSubmittedTo = ref('')
const moreFiltersOpen = ref(false)
const page = ref(1)
const pageSize = ref(10)

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const listQuery = computed<BenchmarkingQuery>(() => ({
  center: gbsFilter.value === 'All' ? undefined : gbsFilter.value,
  domain: domainFilter.value === 'All' ? undefined : domainFilter.value,
  pl1: pl1Filter.value === 'All' ? undefined : pl1Filter.value,
  pl2: pl2Filter.value === 'All' ? undefined : pl2Filter.value,
  pl3Code: pl3Filter.value === 'All' ? undefined : pl3Filter.value,
  submittedFrom: submittedFrom.value || undefined,
  submittedTo: submittedTo.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const benchmarkingQuery = useBenchmarkingQuery(listQuery)
const data = computed(() => benchmarkingQuery.data.value)
const rows = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const gbsOptions = computed(() => ['All', ...(data.value?.centers ?? [])])
const domainOptions = computed(() => ['All', ...(data.value?.domains ?? [])])
const pl1Options = computed(() => ['All', ...(data.value?.pl1Names ?? [])])
const pl2Options = computed(() => ['All', ...(data.value?.pl2Names ?? [])])
const pl3Options = computed(() => data.value?.pl3Options ?? [])
const loading = computed(() => benchmarkingQuery.isPending.value && !benchmarkingQuery.data.value)
const pl3Selected = computed(() => pl3Filter.value !== 'All')

function formatSeconds(value: number | string | null | undefined) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`
}

function formatCapacity(value: number | string | null | undefined) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function formatPct(value: number | string | null | undefined) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(1)}%`
}

const advancedFilterCount = computed(() => Number(Boolean(submittedFrom.value || submittedTo.value)))

function resetPage() {
  page.value = 1
}

function toggleMoreFilters() {
  if (!moreFiltersOpen.value) {
    draftSubmittedFrom.value = submittedFrom.value
    draftSubmittedTo.value = submittedTo.value
  }
  moreFiltersOpen.value = !moreFiltersOpen.value
}

function applyAdvancedFilters() {
  submittedFrom.value = draftSubmittedFrom.value
  submittedTo.value = draftSubmittedTo.value
  resetPage()
  moreFiltersOpen.value = false
}

function exportBenchmark() {
  toast.success('Export prepared (prototype)')
}

watch(
  [gbsFilter, domainFilter, pl1Filter, pl2Filter, pl3Filter, submittedFrom, submittedTo],
  () => {
    resetPage()
  },
)

watch(
  () => ({
    totalPages: benchmarkingQuery.data.value?.totalPages,
    fetching: benchmarkingQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

watch(
  () => benchmarkingQuery.isError.value,
  (isError) => {
    if (isError) {
      toast.error(
        benchmarkingQuery.error.value instanceof Error
          ? benchmarkingQuery.error.value.message
          : 'Could not load benchmarking.',
      )
    }
  },
)
</script>

<template>
  <div class="space-y-3.5">
    <PageActions class="mb-0">
      <Button @click="exportBenchmark">Export Benchmark</Button>
    </PageActions>

    <div class="flex flex-wrap items-end gap-2.5">
      <FilterField label="GBS Center">
        <select v-model="gbsFilter" :class="[selectClass, 'w-[170px]']">
          <option v-for="option in gbsOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </FilterField>
      <FilterField label="Domain">
        <select v-model="domainFilter" :class="[selectClass, 'w-[150px]']">
          <option v-for="option in domainOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </FilterField>
      <FilterField label="PL1">
        <select v-model="pl1Filter" :class="[selectClass, 'w-[170px]']">
          <option v-for="option in pl1Options" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </FilterField>
      <FilterField label="PL2">
        <select v-model="pl2Filter" :class="[selectClass, 'w-[210px]']">
          <option v-for="option in pl2Options" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </FilterField>
      <FilterField label="PL3">
        <select v-model="pl3Filter" :class="[selectClass, 'w-[220px]']">
          <option value="All">All</option>
          <option v-for="option in pl3Options" :key="option.code" :value="option.code">
            {{ option.name }}
          </option>
        </select>
      </FilterField>
      <Button variant="outline" @click="toggleMoreFilters">
        More Filters{{ advancedFilterCount ? ` (${advancedFilterCount})` : '' }}
      </Button>
    </div>

    <div
      v-if="moreFiltersOpen"
      class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3"
    >
      <FilterField label="Submitted Date From">
        <DatePicker
          v-model="draftSubmittedFrom"
          aria-label="Submitted date from"
          placeholder="From"
          class="w-[180px]"
        />
      </FilterField>
      <FilterField label="Submitted Date To">
        <DatePicker
          v-model="draftSubmittedTo"
          aria-label="Submitted date to"
          placeholder="To"
          class="w-[180px]"
        />
      </FilterField>
      <Button
        variant="outline"
        @click="
          () => {
            draftSubmittedFrom = ''
            draftSubmittedTo = ''
          }
        "
      >
        Clear
      </Button>
      <Button @click="applyAdvancedFilters">Apply Filters</Button>
    </div>

    <div v-if="advancedFilterCount" class="flex flex-wrap gap-2">
      <button
        v-if="submittedFrom"
        type="button"
        class="rounded-full border bg-card px-2.5 py-1 text-xs"
        @click="submittedFrom = ''"
      >
        Submitted after: {{ submittedFrom }} ×
      </button>
      <button
        v-if="submittedTo"
        type="button"
        class="rounded-full border bg-card px-2.5 py-1 text-xs"
        @click="submittedTo = ''"
      >
        Submitted before: {{ submittedTo }} ×
      </button>
    </div>

    <ListLoading v-if="loading" class="h-48" />

    <template v-else-if="data">
      <div class="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Selected PL3"
          :value="data.selectedPl3 || '—'"
          hint="Like-for-like benchmark"
          value-class="text-base"
        />
        <MetricCard
          label="Best daily capacity / agent"
          :value="formatCapacity(data.bestDailyCapacity)"
          :hint="data.bestDailyCapacityHint || undefined"
        />
        <MetricCard
          label="Median cycle time"
          :value="formatSeconds(data.medianCycleTimeSeconds)"
          hint="Same PL3 median"
        />
        <MetricCard
          label="Production support ratio"
          :value="formatPct(data.productionSupportRatioPct)"
          hint="Support FTE / Delivery HC"
        />
      </div>

      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">Same-PL3 Productivity Benchmark</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="overflow-x-auto rounded-lg border">
            <Table class="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead>GBS</TableHead>
                  <TableHead>Shared KPI Line</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>PL3</TableHead>
                  <TableHead>Cycle time</TableHead>
                  <TableHead>Daily Production Capacity / Agent</TableHead>
                  <TableHead>Production Support Ratio</TableHead>
                  <TableHead>Capacity Creation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="(row, index) in rows"
                  :key="`${row.pl3Code}-${row.gbs}-${row.sharedKpiLine}-${index}`"
                >
                  <TableCell>{{ row.gbs }}</TableCell>
                  <TableCell>{{ row.sharedKpiLine }}</TableCell>
                  <TableCell>{{ row.domain }}</TableCell>
                  <TableCell>{{ row.pl3 }}</TableCell>
                  <TableCell>{{ formatSeconds(row.cycleTimeSeconds) }}</TableCell>
                  <TableCell>{{ formatCapacity(row.dailyCapacityPerAgent) }}</TableCell>
                  <TableCell>{{ formatPct(row.productionSupportRatioPct) }}</TableCell>
                  <TableCell>
                    <CapacityCell :value="row.capacityCreation" />
                  </TableCell>
                </TableRow>
                <TableRow v-if="!rows.length">
                  <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
                    {{
                      pl3Selected
                        ? 'No benchmark rows found.'
                        : 'Select a PL3 to compare like-for-like work.'
                    }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <TablePager
            :total="total"
            :page="page"
            :page-size="pageSize"
            label="benchmark rows"
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
  </div>
</template>
