<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
import QueryPanel from '@/components/QueryPanel.vue'
import TablePager from '@/components/TablePager.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { NativeSelect } from '@/components/ui/native-select'

import { triggerDownload } from '@/features/exercise-management/downloadBlob'

import { governanceApi } from '../api'
import { useBenchmarkingQuery } from '../api/queries'
import { formatCapacity, formatPct, formatSeconds } from '../reportFormat'
import type { BenchmarkingQuery } from '../types'
import { createBenchmarkingColumns } from './benchmarkingColumns'
import FilterField from './FilterField.vue'
import MetricCard from './MetricCard.vue'

const emptyFilters = () => ({
  gbs: '',
  domain: '',
  pl1: '',
  pl2: '',
  pl3: '',
  validatedFrom: '',
  validatedTo: '',
})

const draft = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const page = ref(1)
const pageSize = ref(10)
const exportOpen = ref(false)
const exporting = ref(false)
const fieldClass = 'w-[220px]'

const listQuery = computed<BenchmarkingQuery>(() => ({
  center: applied.gbs || undefined,
  domain: applied.domain || undefined,
  pl1: applied.pl1 || undefined,
  pl2: applied.pl2 || undefined,
  pl3Code: applied.pl3 || undefined,
  validatedFrom: applied.validatedFrom || undefined,
  validatedTo: applied.validatedTo || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const benchmarkingQuery = useBenchmarkingQuery(listQuery)
const data = computed(() => benchmarkingQuery.data.value)
const rows = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const gbsOptions = computed(() => data.value?.centers ?? [])
const domainOptions = computed(() => data.value?.domains ?? [])
const pl1Options = computed(() => data.value?.pl1Names ?? [])
const pl2Options = computed(() => data.value?.pl2Names ?? [])
const pl3Options = computed(() => data.value?.pl3Options ?? [])
const loading = computed(() => benchmarkingQuery.isPending.value && !benchmarkingQuery.data.value)
const pl3Selected = computed(() => Boolean(applied.pl3))

const columns = createBenchmarkingColumns()

function applySearch() {
  Object.assign(applied, { ...draft })
  page.value = 1
}

function clearFilters() {
  Object.assign(draft, emptyFilters())
  Object.assign(applied, emptyFilters())
  page.value = 1
}

async function confirmExport() {
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
    <QueryPanel show-export :exporting="exporting" @search="applySearch" @clear="clearFilters" @export="exportOpen = true">
      <FilterField label="GBS Center">
        <NativeSelect v-model="draft.gbs" :class="fieldClass">
          <option value="">All</option>
          <option v-for="option in gbsOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Domain">
        <NativeSelect v-model="draft.domain" :class="fieldClass">
          <option value="">All</option>
          <option v-for="option in domainOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="PL1">
        <NativeSelect v-model="draft.pl1" :class="fieldClass">
          <option value="">All</option>
          <option v-for="option in pl1Options" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="PL2">
        <NativeSelect v-model="draft.pl2" :class="fieldClass">
          <option value="">All</option>
          <option v-for="option in pl2Options" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="PL3">
        <NativeSelect v-model="draft.pl3" :class="fieldClass">
          <option value="">All</option>
          <option v-for="option in pl3Options" :key="option.code" :value="option.code">
            {{ option.name }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Validated Date From">
        <DatePicker
          v-model="draft.validatedFrom"
          aria-label="Validated date from"
          placeholder="From"
          :class="fieldClass"
        />
      </FilterField>
      <FilterField label="Validated Date To">
        <DatePicker
          v-model="draft.validatedTo"
          aria-label="Validated date to"
          placeholder="To"
          :class="fieldClass"
        />
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
          <DataTable
            :columns="columns"
            :data="rows"
            table-class="min-w-[1100px]"
            :get-row-id="(row, index) => `${row.pl3Code}-${row.gbs}-${row.sharedKpiLine}-${index}`"
            :empty-text="
              pl3Selected
                ? 'No benchmark rows found.'
                : 'Select a PL3 to compare like-for-like work.'
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
