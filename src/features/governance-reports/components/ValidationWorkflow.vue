<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'

import ListLoading from '@/components/ListLoading.vue'
import TablePager from '@/components/TablePager.vue'
import { Badge } from '@/components/ui/badge'
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

import { useValidationWorkflowQuery } from '../api/queries'
import type { ValidationWorkflowQuery } from '../types'
import CapacityCell from './CapacityCell.vue'
import FilterField from './FilterField.vue'

const exerciseFilter = ref('')
const appliedExerciseCode = ref('')
const gbsFilter = ref('All')
const domainFilter = ref('All')
const pl3Filter = ref('All')
const toolkitFilter = ref('All')
const agingMinDays = ref('')
const appliedAgingMinDays = ref<number | undefined>(undefined)
const submittedFrom = ref('')
const submittedTo = ref('')
const draftSubmittedFrom = ref('')
const draftSubmittedTo = ref('')
const moreFiltersOpen = ref(false)
const page = ref(1)
const pageSize = ref(10)

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const listQuery = computed<ValidationWorkflowQuery>(() => ({
  exerciseCode: appliedExerciseCode.value || undefined,
  center: gbsFilter.value === 'All' ? undefined : gbsFilter.value,
  domain: domainFilter.value === 'All' ? undefined : domainFilter.value,
  pl3Name: pl3Filter.value === 'All' ? undefined : pl3Filter.value,
  toolkitName: toolkitFilter.value === 'All' ? undefined : toolkitFilter.value,
  agingMinDays: appliedAgingMinDays.value,
  submittedFrom: submittedFrom.value || undefined,
  submittedTo: submittedTo.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}))

const workflowQuery = useValidationWorkflowQuery(listQuery)
const rows = computed(() => workflowQuery.data.value?.items ?? [])
const total = computed(() => workflowQuery.data.value?.total ?? 0)
const gbsOptions = computed(() => ['All', ...(workflowQuery.data.value?.centers ?? [])])
const domainOptions = computed(() => ['All', ...(workflowQuery.data.value?.domains ?? [])])
const pl3Options = computed(() => ['All', ...(workflowQuery.data.value?.pl3Names ?? [])])
const toolkitOptions = computed(() => ['All', ...(workflowQuery.data.value?.toolkitNames ?? [])])
const loading = computed(() => workflowQuery.isPending.value && !workflowQuery.data.value)

function formatPct(value: number | string | null | undefined) {
  if (value == null || value === '') return '—'
  const n = Number(String(value).replace(/[%+]/g, ''))
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function displayOrDash(value: string | null | undefined) {
  return value && value.trim() ? value : '—'
}

function agingVariant(days: number): 'secondary' | 'destructive' {
  return days >= 14 ? 'destructive' : 'secondary'
}

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

watch(
  [gbsFilter, domainFilter, pl3Filter, toolkitFilter, submittedFrom, submittedTo],
  () => {
    resetPage()
  },
)

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

watchDebounced(
  exerciseFilter,
  (value) => {
    appliedExerciseCode.value = value
    resetPage()
  },
  { debounce: 400 },
)

watchDebounced(
  agingMinDays,
  (value) => {
    const n = Number.parseInt(String(value).trim(), 10)
    appliedAgingMinDays.value = Number.isFinite(n) && n >= 0 ? n : undefined
    resetPage()
  },
  { debounce: 400 },
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
  <div>
    <Card>
      <CardHeader>
        <CardTitle class="text-base">RST Stuck In Validation</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap items-end gap-2.5">
          <FilterField label="Exercise No">
            <Input
              v-model="exerciseFilter"
              class="w-[180px]"
              placeholder="Search exercise no"
            />
          </FilterField>
          <FilterField label="GBS Center">
            <select v-model="gbsFilter" :class="[selectClass, 'w-[170px]']">
              <option v-for="option in gbsOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Domain">
            <select v-model="domainFilter" :class="[selectClass, 'w-[150px]']">
              <option v-for="option in domainOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="PL3">
            <select v-model="pl3Filter" :class="[selectClass, 'w-[200px]']">
              <option v-for="option in pl3Options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Toolkit">
            <select v-model="toolkitFilter" :class="[selectClass, 'w-[200px]']">
              <option v-for="option in toolkitOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Aging (min days)">
            <Input
              v-model="agingMinDays"
              type="number"
              min="0"
              class="w-[110px]"
              placeholder="e.g. 14"
            />
          </FilterField>
          <Button variant="outline" @click="toggleMoreFilters">
            More Filters{{ advancedFilterCount ? ` (${advancedFilterCount})` : '' }}
          </Button>
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

        <div class="overflow-x-auto rounded-lg border">
          <Table class="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Exercise No</TableHead>
                <TableHead>GBS</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>PL3</TableHead>
                <TableHead>Toolkit</TableHead>
                <TableHead>Current step</TableHead>
                <TableHead>Current owner</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Capacity Creation</TableHead>
                <TableHead>Capacity Creation %</TableHead>
                <TableHead>Volume Increase % YoY</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="loading">
                <TableCell colspan="11" class="p-0">
                  <ListLoading />
                </TableCell>
              </TableRow>
              <template v-else>
                <TableRow v-for="row in rows" :key="row.exerciseNo">
                  <TableCell>{{ row.exerciseNo }}</TableCell>
                  <TableCell>{{ displayOrDash(row.gbs) }}</TableCell>
                  <TableCell>{{ displayOrDash(row.domain) }}</TableCell>
                  <TableCell>{{ displayOrDash(row.pl3) }}</TableCell>
                  <TableCell>{{ displayOrDash(row.toolkit) }}</TableCell>
                  <TableCell>{{ displayOrDash(row.currentStep) }}</TableCell>
                  <TableCell>{{ displayOrDash(row.currentOwner) }}</TableCell>
                  <TableCell>
                    <Badge
                      v-if="row.agingDays != null"
                      :variant="agingVariant(row.agingDays)"
                    >
                      {{ row.agingDays }} days
                    </Badge>
                    <span v-else>—</span>
                  </TableCell>
                  <TableCell>
                    <CapacityCell :value="row.capacityCreation" />
                  </TableCell>
                  <TableCell>{{ formatPct(row.capacityPct) }}</TableCell>
                  <TableCell>{{ row.volumeYoY || '—' }}</TableCell>
                </TableRow>
                <TableRow v-if="!rows.length">
                  <TableCell colspan="11" class="h-24 text-center text-muted-foreground">
                    No stuck exercises found.
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>

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
  </div>
</template>
