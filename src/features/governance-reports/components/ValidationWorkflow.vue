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
import { MonthPicker } from '@/components/ui/month-picker'
import { NativeSelect } from '@/components/ui/native-select'

import { distinctCommaTokens } from '@/lib/commaTokens'
import ToolkitInfoDialog from '@/features/exercise-management/components/ToolkitInfoDialog.vue'
import type { Exercise } from '@/features/exercise-management/types'

import { governanceApi } from '../api'
import { governanceQueryKeys, useValidationWorkflowQuery } from '../api/queries'
import type { ValidationWorkflowQuery, ValidationWorkflowRow } from '../types'
import CurrentOwnerPicker from './CurrentOwnerPicker.vue'
import FilterField from './FilterField.vue'
import { createValidationWorkflowColumns } from './validationWorkflowColumns'

const emptyFilters = () => ({
  exerciseCode: '',
  toolkit: '',
  sizingMonth: '',
  submittedFrom: '',
  submittedTo: '',
  gbs: '',
  domain: '',
  pl3: '',
  carrier: '',
  site: '',
  customerCountry: '',
  currentStep: '',
  currentOwner: '',
  agingMinDays: '',
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
  carrier: applied.carrier || undefined,
  site: applied.site || undefined,
  customerCountry: applied.customerCountry || undefined,
  currentStep: applied.currentStep || undefined,
  currentOwner: applied.currentOwner || undefined,
  sizingMonth: applied.sizingMonth || undefined,
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
const carrierOptions = computed(() => workflowQuery.data.value?.carriers ?? [])
const siteOptions = computed(() => workflowQuery.data.value?.sites ?? [])
const customerCountryOptions = computed(() =>
  [...distinctCommaTokens(workflowQuery.data.value?.customerCountries)].sort((left, right) =>
    left.localeCompare(right),
  ),
)
const currentStepOptions = computed(() => workflowQuery.data.value?.currentSteps ?? [])
const currentOwnerOptions = computed(() => workflowQuery.data.value?.currentOwners ?? [])
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
      <FilterField label="Toolkit">
        <NativeSelect v-model="draft.toolkit" :class="fieldClass" placeholder="All">
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
      <FilterField label="GBS Center">
        <NativeSelect v-model="draft.gbs" :class="fieldClass" placeholder="All">
          <option v-for="option in gbsOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Domain">
        <NativeSelect v-model="draft.domain" :class="fieldClass" placeholder="All">
          <option v-for="option in domainOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="PL3">
        <NativeSelect v-model="draft.pl3" :class="fieldClass" placeholder="All">
          <option v-for="option in pl3Options" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Carrier">
        <NativeSelect v-model="draft.carrier" :class="fieldClass" placeholder="All">
          <option v-for="option in carrierOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="GBS Site">
        <NativeSelect v-model="draft.site" :class="fieldClass" placeholder="All">
          <option v-for="option in siteOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Customer Country">
        <NativeSelect v-model="draft.customerCountry" :class="fieldClass" placeholder="All">
          <option v-for="option in customerCountryOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Current Step">
        <NativeSelect v-model="draft.currentStep" :class="fieldClass" placeholder="All">
          <option v-for="option in currentStepOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </NativeSelect>
      </FilterField>
      <FilterField label="Current Owner">
        <CurrentOwnerPicker v-model="draft.currentOwner" :owners="currentOwnerOptions" />
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
    </QueryPanel>

    <Card>
      <CardContent>
        <DataTable
          :columns="columns"
          :data="rows"
          :pending="loading"
          empty-text="No stuck exercises found."
          table-class="min-w-[2200px]"
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

    <ToolkitInfoDialog v-model:open="toolkitInfoOpen" show-delivery-hc :snapshot="toolkitSnapshot" />
  </div>
</template>
