<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import QueryPanel from '@/components/QueryPanel.vue'
import TablePager from '@/components/TablePager.vue'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/month-picker'
import { NativeSelect } from '@/components/ui/native-select'

import ToolkitInfoDialog from '@/features/exercise-management/components/ToolkitInfoDialog.vue'
import { triggerDownload } from '@/features/exercise-management/downloadBlob'
import type { Exercise } from '@/features/exercise-management/types'

import { governanceApi } from '../api'
import { governanceQueryKeys, useRepositoryQuery } from '../api/queries'
import type { RepositoryListQuery, RepositoryRow } from '../types'
import FilterField from './FilterField.vue'
import { createRstRepositoryColumns } from './rstRepositoryColumns'

const emptyFilters = () => ({
  exerciseCode: '',
  gbs: '',
  domain: '',
  pl3: '',
  toolkit: '',
  sizingMonth: '',
  validatedFrom: '',
  validatedTo: '',
})

const draft = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const page = ref(1)
const pageSize = ref(10)
const exportOpen = ref(false)
const exporting = ref(false)
const queryClient = useQueryClient()
const toolkitInfoOpen = ref(false)
const toolkitSnapshot = ref<Exercise['snapshot'] | null>(null)
const fieldClass = 'w-[220px]'

const listQuery = computed<RepositoryListQuery>(() => ({
  exerciseCode: applied.exerciseCode || undefined,
  center: applied.gbs || undefined,
  domain: applied.domain || undefined,
  pl3Name: applied.pl3 || undefined,
  toolkitName: applied.toolkit || undefined,
  sizingMonth: applied.sizingMonth || undefined,
  validatedFrom: applied.validatedFrom || undefined,
  validatedTo: applied.validatedTo || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const repositoryQuery = useRepositoryQuery(listQuery)
const rows = computed(() => repositoryQuery.data.value?.items ?? [])
const total = computed(() => repositoryQuery.data.value?.total ?? 0)
const gbsOptions = computed(() => repositoryQuery.data.value?.centers ?? [])
const domainOptions = computed(() => repositoryQuery.data.value?.domains ?? [])
const pl3Options = computed(() => repositoryQuery.data.value?.pl3Names ?? [])
const toolkitOptions = computed(() => repositoryQuery.data.value?.toolkitNames ?? [])
const loading = computed(() => repositoryQuery.isPending.value && !repositoryQuery.data.value)

const columns = computed(() =>
  createRstRepositoryColumns({
    onToolkitInfo: onToolkitClick,
  }),
)

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
    const result = await governanceApi.exportRepository(filters)
    triggerDownload(result.blob, result.filename)
    exportOpen.value = false
    toast.success('Export downloaded.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Export failed.')
  } finally {
    exporting.value = false
  }
}

async function onToolkitClick(row: RepositoryRow) {
  if (!row.exerciseUuid) {
    toast.error('Could not load toolkit info.')
    return
  }
  try {
    toolkitSnapshot.value = await queryClient.fetchQuery({
      queryKey: governanceQueryKeys.repositoryToolkit(row.exerciseUuid),
      queryFn: () => governanceApi.repositoryToolkitInfo(row.exerciseUuid),
    })
    toolkitInfoOpen.value = true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load toolkit info.')
  }
}

watch(
  () => ({
    totalPages: repositoryQuery.data.value?.totalPages,
    fetching: repositoryQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

watch(
  () => repositoryQuery.isError.value,
  (isError) => {
    if (isError) {
      toast.error(
        repositoryQuery.error.value instanceof Error
          ? repositoryQuery.error.value.message
          : 'Could not load repository.',
      )
    }
  },
)
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <QueryPanel
      title="Filters"
      show-export
      :exporting="exporting"
      @search="applySearch"
      @clear="clearFilters"
      @export="exportOpen = true"
    >
      <FilterField label="Exercise No">
        <Input
          v-model="draft.exerciseCode"
          :class="fieldClass"
          placeholder="Search exercise no"
        />
      </FilterField>
      <FilterField label="GBS Center">
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.gbs"
          @update:model-value="draft.gbs = String($event ?? '')"
        >
          <option value="">All</option>
          <option v-for="option in gbsOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Domain">
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.domain"
          @update:model-value="draft.domain = String($event ?? '')"
        >
          <option value="">All</option>
          <option v-for="option in domainOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="PL3">
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.pl3"
          @update:model-value="draft.pl3 = String($event ?? '')"
        >
          <option value="">All</option>
          <option v-for="option in pl3Options" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Toolkit">
        <NativeSelect
          :class="fieldClass"
          :model-value="draft.toolkit"
          @update:model-value="draft.toolkit = String($event ?? '')"
        >
          <option value="">All</option>
          <option v-for="option in toolkitOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Sizing Month">
        <MonthPicker
          v-model="draft.sizingMonth"
          aria-label="Sizing month"
          placeholder="All months"
          :class="fieldClass"
        />
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

    <Card>
      <CardContent>
        <DataTable
          :columns="columns"
          :data="rows"
          :pending="loading"
          empty-text="No repository records found."
          table-class="min-w-[1480px]"
          :get-row-id="(row, index) => `${row.exerciseId}-${row.site}-${row.toolkit}-${index}`"
        />

        <TablePager
          :total="total"
          :page="page"
          :page-size="pageSize"
          label="repository records"
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

    <ConfirmDialog
      v-model:open="exportOpen"
      title="Export Repository"
      description="Download all repository rows matching the applied search filters as an Excel file. Pagination is not applied."
      confirm-label="Export"
      confirm-variant="default"
      :pending="exporting"
      @confirm="confirmExport"
    />

    <ToolkitInfoDialog v-model:open="toolkitInfoOpen" :snapshot="toolkitSnapshot" />
  </div>
</template>
