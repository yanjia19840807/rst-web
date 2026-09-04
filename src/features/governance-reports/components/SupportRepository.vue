<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'

import { triggerDownload } from '@/features/exercise-management/downloadBlob'

import { governanceApi } from '../api'
import { useSupportRepositoryQuery } from '../api/queries'
import { formatHc } from '../reportFormat'
import type { SupportRepositoryQuery } from '../types'
import FilterField from './FilterField.vue'
import MetricCard from './MetricCard.vue'
import {
  createSupportCategoryColumns,
  createSupportRowColumns,
} from './supportRepositoryColumns'

const gbsFilter = ref('All')
const categoryFilter = ref('All')
const toolkitFilter = ref('All')
const submittedFrom = ref('')
const submittedTo = ref('')
const draftSubmittedFrom = ref('')
const draftSubmittedTo = ref('')
const moreFiltersOpen = ref(false)
const page = ref(1)
const pageSize = ref(10)
const exportOpen = ref(false)
const exporting = ref(false)

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const listQuery = computed<SupportRepositoryQuery>(() => ({
  center: gbsFilter.value === 'All' ? undefined : gbsFilter.value,
  categoryId: categoryFilter.value === 'All' ? undefined : categoryFilter.value,
  toolkitName: toolkitFilter.value === 'All' ? undefined : toolkitFilter.value,
  submittedFrom: submittedFrom.value || undefined,
  submittedTo: submittedTo.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const supportQuery = useSupportRepositoryQuery(listQuery)
const data = computed(() => supportQuery.data.value)
const rows = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const categorySummaries = computed(() => data.value?.categorySummaries ?? [])
const gbsOptions = computed(() => ['All', ...(data.value?.centers ?? [])])
const categoryOptions = computed(() => data.value?.categories ?? [])
const toolkitOptions = computed(() => ['All', ...(data.value?.toolkitNames ?? [])])
const loading = computed(() => supportQuery.isPending.value && !supportQuery.data.value)

const categoryColumns = createSupportCategoryColumns()
const rowColumns = createSupportRowColumns()

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

async function confirmExport() {
  exporting.value = true
  try {
    const { page: _page, pageSize: _pageSize, ...filters } = listQuery.value
    const result = await governanceApi.exportSupportRepository(filters)
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
  [gbsFilter, categoryFilter, toolkitFilter, submittedFrom, submittedTo],
  () => {
    resetPage()
  },
)

watch(
  () => ({
    totalPages: supportQuery.data.value?.totalPages,
    fetching: supportQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

watch(
  () => supportQuery.isError.value,
  (isError) => {
    if (isError) {
      toast.error(
        supportQuery.error.value instanceof Error
          ? supportQuery.error.value.message
          : 'Could not load support repository.',
      )
    }
  },
)
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <PageActions>
      <Button :disabled="exporting" @click="exportOpen = true">Export Support Repository</Button>
    </PageActions>

    <Card>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap items-end gap-2.5">
          <FilterField label="GBS Center">
            <select v-model="gbsFilter" :class="[selectClass, 'w-[180px]']">
              <option v-for="option in gbsOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Standard Category">
            <select v-model="categoryFilter" :class="[selectClass, 'w-[200px]']">
              <option value="All">All</option>
              <option
                v-for="option in categoryOptions"
                :key="option.id"
                :value="option.id"
              >
                {{ option.name }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Toolkit">
            <select v-model="toolkitFilter" :class="[selectClass, 'w-[210px]']">
              <option v-for="option in toolkitOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <Button variant="outline" @click="toggleMoreFilters">
            More Filters{{ advancedFilterCount ? ` (${advancedFilterCount})` : '' }}
          </Button>
        </div>

        <div
          v-if="moreFiltersOpen"
          class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted/40 p-3"
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
      </CardContent>
    </Card>

    <ListLoading v-if="loading" class="h-48" />

    <template v-else-if="data">
      <div class="grid gap-3 sm:grid-cols-2">
        <MetricCard label="Total support FTE" :value="formatHc(data.totalSupportFte)" />
        <MetricCard
          label="Top category"
          :value="data.topCategory || '—'"
          :hint="data.topCategoryFte == null || data.topCategoryFte === '' ? undefined : `${formatHc(data.topCategoryFte)} FTE`"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Support FTE By Standard Category</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            :columns="categoryColumns"
            :data="categorySummaries"
            empty-text="No support categories found."
            :get-row-id="(row) => row.category"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Granular Support Rows</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            :columns="rowColumns"
            :data="rows"
            empty-text="No support rows found."
            table-class="min-w-[900px]"
            :get-row-id="(row, index) => `${row.exerciseNo}-${row.activity}-${index}`"
          />
          <TablePager
            :total="total"
            :page="page"
            :page-size="pageSize"
            label="support rows"
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
      title="Export Support Repository"
      description="Download all support rows matching the current filters as an Excel file. Pagination is not applied."
      confirm-label="Export"
      confirm-variant="default"
      :pending="exporting"
      @confirm="confirmExport"
    />
  </div>
</template>
