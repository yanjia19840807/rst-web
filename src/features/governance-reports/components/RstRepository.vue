<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'

import { triggerDownload } from '@/features/exercise-management/downloadBlob'

import { governanceApi } from '../api'
import { useRepositoryQuery } from '../api/queries'
import type { RepositoryListQuery } from '../types'
import FilterField from './FilterField.vue'
import { createRstRepositoryColumns } from './rstRepositoryColumns'

const exerciseFilter = ref('')
const appliedExerciseCode = ref('')
const gbsFilter = ref('All')
const domainFilter = ref('All')
const pl3Filter = ref('All')
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

const listQuery = computed<RepositoryListQuery>(() => ({
  exerciseCode: appliedExerciseCode.value || undefined,
  center: gbsFilter.value === 'All' ? undefined : gbsFilter.value,
  domain: domainFilter.value === 'All' ? undefined : domainFilter.value,
  pl3Name: pl3Filter.value === 'All' ? undefined : pl3Filter.value,
  toolkitName: toolkitFilter.value === 'All' ? undefined : toolkitFilter.value,
  submittedFrom: submittedFrom.value || undefined,
  submittedTo: submittedTo.value || undefined,
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

function onToolkitClick(name: string) {
  toast.message(name, { description: 'Toolkit info dialog (prototype)' })
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
  [gbsFilter, domainFilter, pl3Filter, toolkitFilter, submittedFrom, submittedTo],
  () => {
    resetPage()
  },
)

watchDebounced(
  exerciseFilter,
  (value) => {
    appliedExerciseCode.value = value
    resetPage()
  },
  { debounce: 400 },
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
    <PageActions>
      <Button :disabled="exporting" @click="exportOpen = true">Export Repository</Button>
    </PageActions>

    <Card>
      <CardHeader>
        <div class="flex items-baseline gap-2">
          <CardTitle class="text-base">Repository Table</CardTitle>
          <span class="text-xs text-muted-foreground">{{ total }} records</span>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap items-end gap-2.5">
          <FilterField label="Exercise No">
            <Input
              v-model="exerciseFilter"
              class="w-[200px]"
              placeholder="Search exercise no"
            />
          </FilterField>
          <FilterField label="GBS Center">
            <select v-model="gbsFilter" :class="[selectClass, 'w-[180px]']">
              <option v-for="option in gbsOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Domain">
            <select v-model="domainFilter" :class="[selectClass, 'w-[160px]']">
              <option v-for="option in domainOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="PL3">
            <select v-model="pl3Filter" :class="[selectClass, 'w-[210px]']">
              <option v-for="option in pl3Options" :key="option" :value="option">
                {{ option }}
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
      description="Download all repository rows matching the current filters as an Excel file. Pagination is not applied."
      confirm-label="Export"
      confirm-variant="default"
      :pending="exporting"
      @confirm="confirmExport"
    />
  </div>
</template>
