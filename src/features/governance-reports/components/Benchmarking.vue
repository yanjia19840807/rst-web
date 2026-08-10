<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'

import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { governanceApi } from '../api'
import type { BenchmarkingResponse } from '../types'
import CapacityCell from './CapacityCell.vue'
import FilterField from './FilterField.vue'
import MetricCard from './MetricCard.vue'

const GBS_OPTIONS = ['All', 'GBS China', 'GBS India', 'GBS Philippines', 'GBS Portugal']
const DOMAIN_OPTIONS = ['All', 'FINANCE', 'CUSTOMER CARE']
const PL1_OPTIONS = ['All', 'Record to report', 'Procure to pay', 'Booking', 'Documentation']
const PL2_OPTIONS = [
  'All',
  'Bank Reconciliation',
  'Accounts Payable Classification',
  'Booking',
  'HO Documentation',
]
const PL3_OPTIONS = [
  'All',
  'BANK RECONCILIATION',
  'AP CLASSIFICATION',
  'BOOKING AMENDMENTS',
  'BLANK FORMS',
]

const loading = ref(true)
const data = ref<BenchmarkingResponse | null>(null)
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

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const filteredRows = computed(() => {
  const rows = data.value?.rows ?? []
  return rows.filter((row) => {
    const gbsOk = gbsFilter.value === 'All' || row.gbs === gbsFilter.value
    const domainOk = domainFilter.value === 'All' || row.domain === domainFilter.value
    const pl3Ok = pl3Filter.value === 'All' || row.pl3 === pl3Filter.value
    return gbsOk && domainOk && pl3Ok
  })
})

const advancedFilterCount = computed(() => Number(Boolean(submittedFrom.value || submittedTo.value)))
const hasActiveFilters = computed(
  () =>
    gbsFilter.value !== 'All' ||
    domainFilter.value !== 'All' ||
    pl1Filter.value !== 'All' ||
    pl2Filter.value !== 'All' ||
    pl3Filter.value !== 'All' ||
    Boolean(submittedFrom.value || submittedTo.value),
)

function clearFilters() {
  gbsFilter.value = 'All'
  domainFilter.value = 'All'
  pl1Filter.value = 'All'
  pl2Filter.value = 'All'
  pl3Filter.value = 'All'
  submittedFrom.value = ''
  submittedTo.value = ''
  draftSubmittedFrom.value = ''
  draftSubmittedTo.value = ''
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
  moreFiltersOpen.value = false
}

function exportBenchmark() {
  toast.success('Export prepared (prototype)')
}

async function load() {
  loading.value = true
  try {
    data.value = await governanceApi.benchmarking()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load benchmarking.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-3.5">
    <PageActions class="mb-0">
      <Button @click="exportBenchmark">Export Benchmark</Button>
    </PageActions>

    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-wrap items-end gap-2.5">
        <FilterField label="GBS Center">
          <select v-model="gbsFilter" :class="[selectClass, 'w-[170px]']">
            <option v-for="option in GBS_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </FilterField>
        <FilterField label="Domain">
          <select v-model="domainFilter" :class="[selectClass, 'w-[150px]']">
            <option v-for="option in DOMAIN_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </FilterField>
        <FilterField label="PL1">
          <select v-model="pl1Filter" :class="[selectClass, 'w-[170px]']">
            <option v-for="option in PL1_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </FilterField>
        <FilterField label="PL2">
          <select v-model="pl2Filter" :class="[selectClass, 'w-[210px]']">
            <option v-for="option in PL2_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </FilterField>
        <FilterField label="PL3">
          <select v-model="pl3Filter" :class="[selectClass, 'w-[200px]']">
            <option v-for="option in PL3_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </FilterField>
        <Button variant="outline" @click="toggleMoreFilters">
          More Filters{{ advancedFilterCount ? ` (${advancedFilterCount})` : '' }}
        </Button>
      </div>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="shrink-0 text-sm font-semibold text-primary"
        @click="clearFilters"
      >
        Clear All
      </button>
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

    <div v-if="loading" class="text-sm text-muted-foreground">Loading benchmarking…</div>

    <template v-else-if="data">
      <div class="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Selected PL3"
          :value="data.selectedPl3"
          hint="Like-for-like benchmark"
          value-class="text-base"
        />
        <MetricCard
          label="Best daily capacity / agent"
          :value="data.bestDailyCapacity"
          :hint="data.bestDailyCapacityHint"
        />
        <MetricCard
          label="Median cycle time"
          :value="data.medianCycleTime"
          hint="Same PL3 median"
        />
        <MetricCard
          label="Production support ratio"
          :value="data.productionSupportRatio"
          hint="Support FTE / Delivery HC"
        />
      </div>

      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">Same-PL3 Productivity Benchmark</CardTitle>
        </CardHeader>
        <CardContent>
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
                  v-for="(row, index) in filteredRows"
                  :key="`${row.gbs}-${row.sharedKpiLine}-${index}`"
                >
                  <TableCell>{{ row.gbs }}</TableCell>
                  <TableCell>{{ row.sharedKpiLine }}</TableCell>
                  <TableCell>{{ row.domain }}</TableCell>
                  <TableCell>{{ row.pl3 }}</TableCell>
                  <TableCell>{{ row.cycleTime }}</TableCell>
                  <TableCell>{{ row.dailyCapacityPerAgent }}</TableCell>
                  <TableCell>{{ row.productionSupportRatio }}</TableCell>
                  <TableCell>
                    <CapacityCell :value="row.capacityCreation" />
                  </TableCell>
                </TableRow>
                <TableRow v-if="!filteredRows.length">
                  <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
                    No benchmark rows found.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
