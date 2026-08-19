<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ListLoading from '@/components/ListLoading.vue'
import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useSupportRepositoryQuery } from '../api/queries'
import type { SupportRepositoryQuery } from '../types'
import FilterField from './FilterField.vue'
import MetricCard from './MetricCard.vue'

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

function formatHc(value: number | string | null | undefined) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function formatVolume(value: number | string | null | undefined) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
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

function exportSupport() {
  toast.success('Export prepared (prototype)')
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
  <div>
    <PageActions>
      <Button @click="exportSupport">Export Support Repository</Button>
    </PageActions>

    <div class="mb-3 flex flex-wrap items-end gap-2.5">
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
      class="mb-3 flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3"
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

    <div v-if="advancedFilterCount" class="mb-3 flex flex-wrap gap-2">
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

      <Card class="mt-3.5">
        <CardHeader>
          <CardTitle class="text-base">Support FTE By Standard Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Standard Category</TableHead>
                  <TableHead>Support FTE</TableHead>
                  <TableHead>% of support FTE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="row in categorySummaries" :key="row.category">
                  <TableCell>{{ row.category }}</TableCell>
                  <TableCell>{{ formatHc(row.supportFte) }}</TableCell>
                  <TableCell>{{ row.pctOfSupport || '—' }}</TableCell>
                </TableRow>
                <TableRow v-if="!categorySummaries.length">
                  <TableCell colspan="3" class="h-24 text-center text-muted-foreground">
                    No support categories found.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card class="mt-3.5">
        <CardHeader>
          <CardTitle class="text-base">Granular Support Rows</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto rounded-lg border">
            <Table class="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Exercise NO</TableHead>
                  <TableHead>GBS Center</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>PL3</TableHead>
                  <TableHead>Toolkit</TableHead>
                  <TableHead>Standard Category</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>FTE</TableHead>
                  <TableHead>Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(row, index) in rows" :key="`${row.exerciseNo}-${row.activity}-${index}`">
                  <TableCell>{{ row.exerciseNo }}</TableCell>
                  <TableCell>{{ row.center }}</TableCell>
                  <TableCell>{{ row.domain }}</TableCell>
                  <TableCell>{{ row.pl3 }}</TableCell>
                  <TableCell>{{ row.toolkit }}</TableCell>
                  <TableCell>{{ row.standardCategory }}</TableCell>
                  <TableCell>{{ row.activity }}</TableCell>
                  <TableCell>{{ row.frequency }}</TableCell>
                  <TableCell>{{ formatVolume(row.volume) }}</TableCell>
                  <TableCell>{{ row.uom }}</TableCell>
                  <TableCell>{{ formatHc(row.fte) }}</TableCell>
                  <TableCell>{{ row.comments || '—' }}</TableCell>
                </TableRow>
                <TableRow v-if="!rows.length">
                  <TableCell colspan="12" class="h-24 text-center text-muted-foreground">
                    No support rows found.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
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
  </div>
</template>
