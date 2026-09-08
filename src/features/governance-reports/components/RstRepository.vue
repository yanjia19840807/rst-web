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
  gbs: 'All',
  domain: 'All',
  pl3: 'All',
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
const queryClient = useQueryClient()
const toolkitInfoOpen = ref(false)
const toolkitSnapshot = ref<Exercise['snapshot'] | null>(null)
const fieldClass = 'w-[220px]'

const listQuery = computed<RepositoryListQuery>(() => ({
  exerciseCode: applied.exerciseCode || undefined,
  center: applied.gbs === 'All' ? undefined : applied.gbs,
  domain: applied.domain === 'All' ? undefined : applied.domain,
  pl3Name: applied.pl3 === 'All' ? undefined : applied.pl3,
  toolkitName: applied.toolkit === 'All' ? undefined : applied.toolkit,
  submittedFrom: applied.submittedFrom || undefined,
  submittedTo: applied.submittedTo || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const repositoryQuery = useRepositoryQuery(listQuery)
const rows = computed(() => repositoryQuery.data.value?.items ?? [])
const total = computed(() => repositoryQuery.data.value?.total ?? 0)
const gbsOptions = computed(() => ['All', ...(repositoryQuery.data.value?.centers ?? [])])
const domainOptions = computed(() => ['All', ...(repositoryQuery.data.value?.domains ?? [])])
const pl3Options = computed(() => ['All', ...(repositoryQuery.data.value?.pl3Names ?? [])])
const toolkitOptions = computed(() => ['All', ...(repositoryQuery.data.value?.toolkitNames ?? [])])
const loading = computed(() => repositoryQuery.isPending.value && !repositoryQuery.data.value)

const columns = computed(() =>
  createRstRepositoryColumns({
    onToolkitClick,
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
    <Card>
      <CardContent class="space-y-3">
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
              @update:model-value="draft.gbs = String($event ?? 'All')"
            >
              <option v-for="option in gbsOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </FilterField>
          <FilterField label="Domain">
            <NativeSelect
              :class="fieldClass"
              :model-value="draft.domain"
              @update:model-value="draft.domain = String($event ?? 'All')"
            >
              <option v-for="option in domainOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </FilterField>
          <FilterField label="PL3">
            <NativeSelect
              :class="fieldClass"
              :model-value="draft.pl3"
              @update:model-value="draft.pl3 = String($event ?? 'All')"
            >
              <option v-for="option in pl3Options" :key="option" :value="option">
                {{ option }}
              </option>
            </NativeSelect>
          </FilterField>
          <FilterField label="Toolkit">
            <NativeSelect
              :class="fieldClass"
              :model-value="draft.toolkit"
              @update:model-value="draft.toolkit = String($event ?? 'All')"
            >
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
