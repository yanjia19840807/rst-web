<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'

import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
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

import { useRepositoryQuery } from '../api/queries'
import type { RepositoryListQuery } from '../types'
import CapacityCell from './CapacityCell.vue'
import FilterField from './FilterField.vue'

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

function formatHc(value: number | string | null | undefined) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function formatPct(value: number | string | null | undefined) {
  if (value == null || value === '') return '—'
  const n = Number(String(value).replace(/[%+]/g, ''))
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
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

function exportRepo() {
  toast.success('Export prepared (prototype)')
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
  <div>
    <PageActions>
      <Button @click="exportRepo">Export Repository</Button>
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
          <Table class="min-w-[1480px]">
            <TableHeader>
              <TableRow>
                <TableHead>Exercise No</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>GBS Site</TableHead>
                <TableHead>GBS Country</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>PL1</TableHead>
                <TableHead>PL2</TableHead>
                <TableHead>PL3</TableHead>
                <TableHead>Toolkit</TableHead>
                <TableHead>Customer Country</TableHead>
                <TableHead>Delivery HC</TableHead>
                <TableHead>Right Sizing HC</TableHead>
                <TableHead>Production Support</TableHead>
                <TableHead>Capacity Creation</TableHead>
                <TableHead>Capacity Creation %</TableHead>
                <TableHead>Volume Increase % YoY</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="loading">
                <TableCell colspan="16" class="p-0">
                  <ListLoading />
                </TableCell>
              </TableRow>
              <template v-else>
                <TableRow
                  v-for="(row, index) in rows"
                  :key="`${row.exerciseId}-${row.site}-${row.toolkit}-${index}`"
                >
                  <TableCell>{{ row.exerciseId }}</TableCell>
                  <TableCell>{{ row.carrier }}</TableCell>
                  <TableCell>{{ row.site }}</TableCell>
                  <TableCell>{{ row.country }}</TableCell>
                  <TableCell>{{ row.domain }}</TableCell>
                  <TableCell>{{ row.pl1 }}</TableCell>
                  <TableCell>{{ row.pl2 }}</TableCell>
                  <TableCell>{{ row.pl3 }}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      class="font-semibold text-primary"
                      @click="onToolkitClick(row.toolkit)"
                    >
                      {{ row.toolkit }}
                    </button>
                  </TableCell>
                  <TableCell>{{ row.kpi }}</TableCell>
                  <TableCell>{{ formatHc(row.deliveryHc) }}</TableCell>
                  <TableCell>{{ formatHc(row.rsHc) }}</TableCell>
                  <TableCell>{{ formatHc(row.support) }}</TableCell>
                  <TableCell>
                    <CapacityCell :value="row.capacityCreation" />
                  </TableCell>
                  <TableCell>{{ formatPct(row.capacityPct) }}</TableCell>
                  <TableCell>{{ row.volumeYoY || '—' }}</TableCell>
                </TableRow>
                <TableRow v-if="!rows.length">
                  <TableCell colspan="16" class="h-24 text-center text-muted-foreground">
                    No repository records found.
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
  </div>
</template>
