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
import { useSupportRepositoryQuery } from '../api/queries'
import { formatHc } from '../reportFormat'
import type { SupportRepositoryQuery } from '../types'
import FilterField from './FilterField.vue'
import MetricCard from './MetricCard.vue'
import {
  createSupportCategoryColumns,
  createSupportRowColumns,
} from './supportRepositoryColumns'

const emptyFilters = () => ({
  gbs: 'All',
  category: 'All',
  toolkit: 'All',
  submittedFrom: '',
  submittedTo: '',
})

const draft = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const page = ref(1)
const pageSize = ref(10)
const exportOpen = ref(false)
const exporting = ref(false)
const fieldClass = 'w-[220px]'

const listQuery = computed<SupportRepositoryQuery>(() => ({
  center: applied.gbs === 'All' ? undefined : applied.gbs,
  categoryId: applied.category === 'All' ? undefined : applied.category,
  toolkitName: applied.toolkit === 'All' ? undefined : applied.toolkit,
  submittedFrom: applied.submittedFrom || undefined,
  submittedTo: applied.submittedTo || undefined,
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
    <QueryPanel show-export :exporting="exporting" @search="applySearch" @clear="clearFilters" @export="exportOpen = true">
      <FilterField label="GBS Center">
        <NativeSelect v-model="draft.gbs" :class="fieldClass">
          <option v-for="option in gbsOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Standard Category">
        <NativeSelect v-model="draft.category" :class="fieldClass">
          <option value="All">All</option>
          <option
            v-for="option in categoryOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ option.name }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Toolkit">
        <NativeSelect v-model="draft.toolkit" :class="fieldClass">
          <option v-for="option in toolkitOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Submitted Date From">
        <DatePicker
          v-model="draft.submittedFrom"
          aria-label="Submitted date from"
          placeholder="From"
          :class="fieldClass"
        />
      </FilterField>
      <FilterField label="Submitted Date To">
        <DatePicker
          v-model="draft.submittedTo"
          aria-label="Submitted date to"
          placeholder="To"
          :class="fieldClass"
        />
      </FilterField>
    </QueryPanel>

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
      description="Download all support rows matching the applied search filters as an Excel file. Pagination is not applied."
      confirm-label="Export"
      confirm-variant="default"
      :pending="exporting"
      @confirm="confirmExport"
    />
  </div>
</template>
