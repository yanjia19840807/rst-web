<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'

import QueryPanel from '@/components/QueryPanel.vue'
import TablePager from '@/components/TablePager.vue'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'

import ToolkitInfoDialog from '@/features/exercise-management/components/ToolkitInfoDialog.vue'
import type { Exercise } from '@/features/exercise-management/types'

import { governanceApi } from '../api'
import { governanceQueryKeys, useValidationWorkflowQuery } from '../api/queries'
import type { ValidationWorkflowQuery, ValidationWorkflowRow } from '../types'
import FilterField from './FilterField.vue'
import { createValidationWorkflowColumns } from './validationWorkflowColumns'

const emptyFilters = () => ({
  exerciseCode: '',
  gbs: '',
  domain: '',
  pl3: '',
  toolkit: '',
  agingMinDays: '',
  submittedFrom: '',
  submittedTo: '',
})

function parseAgingMinDays(value: string): number | undefined {
  const n = Number.parseInt(String(value).trim(), 10)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

const draft = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const page = ref(1)
const pageSize = ref(10)
const queryClient = useQueryClient()
const toolkitInfoOpen = ref(false)
const toolkitSnapshot = ref<Exercise['snapshot'] | null>(null)
const fieldClass = 'w-[220px]'

const listQuery = computed<ValidationWorkflowQuery>(() => ({
  exerciseCode: applied.exerciseCode || undefined,
  center: applied.gbs || undefined,
  domain: applied.domain || undefined,
  pl3Name: applied.pl3 || undefined,
  toolkitName: applied.toolkit || undefined,
  agingMinDays: parseAgingMinDays(applied.agingMinDays),
  submittedFrom: applied.submittedFrom || undefined,
  submittedTo: applied.submittedTo || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const workflowQuery = useValidationWorkflowQuery(listQuery)
const rows = computed(() => workflowQuery.data.value?.items ?? [])
const total = computed(() => workflowQuery.data.value?.total ?? 0)
const gbsOptions = computed(() => workflowQuery.data.value?.centers ?? [])
const domainOptions = computed(() => workflowQuery.data.value?.domains ?? [])
const pl3Options = computed(() => workflowQuery.data.value?.pl3Names ?? [])
const toolkitOptions = computed(() => workflowQuery.data.value?.toolkitNames ?? [])
const loading = computed(() => workflowQuery.isPending.value && !workflowQuery.data.value)

const columns = computed(() =>
  createValidationWorkflowColumns({
    onToolkitInfo: onToolkitClick,
  }),
)

async function onToolkitClick(row: ValidationWorkflowRow) {
  if (!row.exerciseUuid) {
    toast.error('Could not load toolkit info.')
    return
  }
  try {
    toolkitSnapshot.value = await queryClient.fetchQuery({
      queryKey: governanceQueryKeys.validationWorkflowToolkit(row.exerciseUuid),
      queryFn: () => governanceApi.validationWorkflowToolkitInfo(row.exerciseUuid),
    })
    toolkitInfoOpen.value = true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load toolkit info.')
  }
}

function applySearch() {
  Object.assign(applied, { ...draft })
  page.value = 1
}

function clearFilters() {
  Object.assign(draft, emptyFilters())
  Object.assign(applied, emptyFilters())
  page.value = 1
}

watch(
  () => ({
    totalPages: workflowQuery.data.value?.totalPages,
    fetching: workflowQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)

watch(
  () => workflowQuery.isError.value,
  (isError) => {
    if (isError) {
      toast.error(
        workflowQuery.error.value instanceof Error
          ? workflowQuery.error.value.message
          : 'Could not load validation workflow.',
      )
    }
  },
)
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <QueryPanel title="Filters" @search="applySearch" @clear="clearFilters">
      <FilterField label="Exercise No">
        <Input
          v-model="draft.exerciseCode"
          :class="fieldClass"
          placeholder="Search exercise no"
        />
      </FilterField>
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
      <FilterField label="PL3">
        <NativeSelect v-model="draft.pl3" :class="fieldClass">
          <option value="">All</option>
          <option v-for="option in pl3Options" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Toolkit">
        <NativeSelect v-model="draft.toolkit" :class="fieldClass">
          <option value="">All</option>
          <option v-for="option in toolkitOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Aging (min days)">
        <Input
          v-model="draft.agingMinDays"
          type="number"
          min="0"
          :class="fieldClass"
          placeholder="e.g. 14"
        />
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

    <Card>
      <CardContent>
        <DataTable
          :columns="columns"
          :data="rows"
          :pending="loading"
          empty-text="No stuck exercises found."
          table-class="min-w-[1280px]"
          :get-row-id="(row) => row.exerciseUuid || row.exerciseNo"
        />

        <TablePager
          :total="total"
          :page="page"
          :page-size="pageSize"
          label="stuck exercises"
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

    <ToolkitInfoDialog v-model:open="toolkitInfoOpen" :snapshot="toolkitSnapshot" />
  </div>
</template>
