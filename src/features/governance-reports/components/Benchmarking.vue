<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
import QueryPanel from '@/components/QueryPanel.vue'
import TablePager from '@/components/TablePager.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/month-picker'
import { NativeSelect } from '@/components/ui/native-select'

import { triggerDownload } from '@/features/exercise-management/downloadBlob'
import { FieldUnit, withUnit } from '@/features/exercise-management/fieldUnits'
import { distinctCommaTokens } from '@/lib/commaTokens'

import { governanceApi } from '../api'
import { useBenchmarkingQuery } from '../api/queries'

import { formatCapacity, formatPct, formatSeconds } from '../reportFormat'
import type { BenchmarkingQuery } from '../types'
import BenchmarkingCenterCharts from './BenchmarkingCenterCharts.vue'
import { createBenchmarkingColumns } from './benchmarkingColumns'
import FilterField from './FilterField.vue'
import MetricCard from './MetricCard.vue'

const emptyFilters = () => ({
  domain: '',
  pl1: '',
  pl2: '',
  pl3: '',
  exerciseCode: '',
  sizingMonth: '',
  validatedFrom: '',
  validatedTo: '',
  gbs: '',
  carrier: '',
  site: '',
  customerCountry: '',
})

const draft = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const page = ref(1)
const pageSize = ref(10)
const exportOpen = ref(false)
const exporting = ref(false)
const fieldClass = 'w-[220px]'

const listQuery = computed<BenchmarkingQuery>(() => ({
  domain: applied.domain || undefined,
  pl1: applied.pl1 || undefined,
  pl2: applied.pl2 || undefined,
  pl3Code: applied.pl3 || undefined,
  exerciseCode: applied.exerciseCode || undefined,
  center: applied.gbs || undefined,
  carrier: applied.carrier || undefined,
  site: applied.site || undefined,
  customerCountry: applied.customerCountry || undefined,
  sizingMonth: applied.sizingMonth || undefined,
  validatedFrom: applied.validatedFrom || undefined,
  validatedTo: applied.validatedTo || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const benchmarkingQuery = useBenchmarkingQuery(listQuery)
const data = computed(() => benchmarkingQuery.data.value)
const rows = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const processPaths = computed(() => data.value?.processPaths ?? [])
const gbsOptions = computed(() => data.value?.centers ?? [])
const carrierOptions = computed(() => data.value?.carriers ?? [])
const siteOptions = computed(() => data.value?.sites ?? [])
const customerCountryOptions = computed(() =>
  [...distinctCommaTokens(data.value?.customerCountries)].sort((left, right) =>
    left.localeCompare(right),
  ),
)
const loading = computed(() => benchmarkingQuery.isPending.value && !benchmarkingQuery.data.value)
const pl3Selected = computed(() => Boolean(applied.pl3))
const pathReady = computed(() => Boolean(draft.pl3))

const domainOptions = computed(() => unique(processPaths.value.map((path) => path.domain)))
const pl1Options = computed(() =>
  unique(
    processPaths.value
      .filter((path) => path.domain === draft.domain)
      .map((path) => path.pl1),
  ),
)
const pl2Options = computed(() =>
  unique(
    processPaths.value
      .filter((path) => path.domain === draft.domain && path.pl1 === draft.pl1)
      .map((path) => path.pl2),
  ),
)
const pl3Options = computed(() => {
  const seen = new Map<string, string>()
  for (const path of processPaths.value) {
    if (path.domain !== draft.domain || path.pl1 !== draft.pl1 || path.pl2 !== draft.pl2) {
      continue
    }
    if (!seen.has(path.pl3Code)) {
      seen.set(path.pl3Code, path.pl3Name)
    }
  }
  return [...seen.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code))
})

const columns = createBenchmarkingColumns()

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right))
}

function applySearch() {
  if (!draft.pl3) return
  Object.assign(applied, { ...draft })
  page.value = 1
}

function clearFilters() {
  Object.assign(draft, emptyFilters())
  Object.assign(applied, emptyFilters())
  page.value = 1
}

function onDomainChange(value: unknown) {
  draft.domain = String(value ?? '')
  draft.pl1 = ''
  draft.pl2 = ''
  draft.pl3 = ''
}

function onPl1Change(value: unknown) {
  draft.pl1 = String(value ?? '')
  draft.pl2 = ''
  draft.pl3 = ''
}

function onPl2Change(value: unknown) {
  draft.pl2 = String(value ?? '')
  draft.pl3 = ''
}

async function confirmExport() {
  if (!applied.pl3) return
  exporting.value = true
  try {
    const { page: _page, pageSize: _pageSize, ...filters } = listQuery.value
    const result = await governanceApi.exportBenchmarking(filters)
    triggerDownload(result.blob, result.filename)
    exportOpen.value = false
    toast.success('Export downloaded.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Export failed.')
  } finally {
    exporting.value = false
  }
}

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
  <div class="grid min-w-0 gap-4">
    <Alert variant="info">
      <Info />
      <AlertDescription>
        Select Domain → PL1 → PL2 → PL3 to compare that work across GBS Centers.
      </AlertDescription>
    </Alert>
    <QueryPanel
      show-export
      :exporting="exporting"
      :search-disabled="!pathReady"
      @search="applySearch"
      @clear="clearFilters"
      @export="exportOpen = true"
    >
      <FilterField label="Domain">
        <NativeSelect
          :model-value="draft.domain"
          :class="fieldClass"
          @update:model-value="onDomainChange"
        >
          <option value="">Select Domain</option>
          <option v-for="option in domainOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="PL1">
        <NativeSelect
          :model-value="draft.pl1"
          :class="fieldClass"
          :disabled="!draft.domain"
          @update:model-value="onPl1Change"
        >
          <option value="">
            {{ draft.domain ? 'Select PL1' : 'Select Domain first' }}
          </option>
          <option v-for="option in pl1Options" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="PL2">
        <NativeSelect
          :model-value="draft.pl2"
          :class="fieldClass"
          :disabled="!draft.pl1"
          @update:model-value="onPl2Change"
        >
          <option value="">
            {{ draft.pl1 ? 'Select PL2' : 'Select PL1 first' }}
          </option>
          <option v-for="option in pl2Options" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="PL3">
        <NativeSelect v-model="draft.pl3" :class="fieldClass" :disabled="!draft.pl2">
          <option value="">
            {{ draft.pl2 ? 'Select PL3' : 'Select PL2 first' }}
          </option>
          <option v-for="option in pl3Options" :key="option.code" :value="option.code">
            {{ option.name }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Exercise No">
        <Input
          v-model="draft.exerciseCode"
          :class="fieldClass"
          placeholder="Search exercise no"
        />
      </FilterField>
      <FilterField label="Sizing Month">
        <MonthPicker
          v-model="draft.sizingMonth"
          aria-label="Sizing month"
          placeholder="All months"
          :class="fieldClass"
        />
      </FilterField>
      <FilterField label="Validated From">
        <DatePicker
          v-model="draft.validatedFrom"
          aria-label="Validated date from"
          placeholder="From"
          :class="fieldClass"
        />
      </FilterField>
      <FilterField label="Validated To">
        <DatePicker
          v-model="draft.validatedTo"
          aria-label="Validated date to"
          placeholder="To"
          :class="fieldClass"
        />
      </FilterField>
      <FilterField label="GBS Center">
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.gbs"
          @update:model-value="draft.gbs = String($event ?? '')"
         placeholder="All">
          <option v-for="option in gbsOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Carrier">
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.carrier"
          @update:model-value="draft.carrier = String($event ?? '')"
         placeholder="All">
          <option v-for="option in carrierOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="GBS Site">
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.site"
          @update:model-value="draft.site = String($event ?? '')"
         placeholder="All">
          <option v-for="option in siteOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Customer Country">
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.customerCountry"
          @update:model-value="draft.customerCountry = String($event ?? '')"
         placeholder="All">
          <option v-for="option in customerCountryOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
    </QueryPanel>

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
          :label="withUnit('Daily capacity / agent', FieldUnit.transactions)"
          :value="formatCapacity(data.dailyCapacityPerAgent)"
          hint="HC-weighted across centers"
        />
        <MetricCard
          :label="withUnit('Cycle time', FieldUnit.seconds)"
          :value="formatSeconds(data.cycleTimeSeconds)"
          hint="HC-weighted across centers"
        />
        <MetricCard
          :label="withUnit('Production support ratio', FieldUnit.percent)"
          :value="formatPct(data.productionSupportRatioPct)"
          hint="Support FTE / Delivery HC"
        />
      </div>

      <BenchmarkingCenterCharts :centers="data.centerComparisons ?? []" />

      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">Same-PL3 Productivity Benchmark</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <DataTable
            :columns="columns"
            :data="rows"
            table-class="min-w-[1800px]"
            :get-row-id="(row, index) => `${row.exerciseNo}-${row.pl3Code}-${row.gbs}-${row.carrier}-${row.site}-${row.sharedKpiLine}-${index}`"
            :empty-text="
              pl3Selected
                ? 'No benchmark rows found.'
                : 'Select a PL3 to compare across GBS Centers.'
            "
          />
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

    <ConfirmDialog
      v-model:open="exportOpen"
      title="Export Benchmark"
      description="Download all benchmark rows matching the applied search filters as an Excel file. Pagination is not applied."
      confirm-label="Export"
      confirm-variant="default"
      :pending="exporting"
      @confirm="confirmExport"
    />
  </div>
</template>
