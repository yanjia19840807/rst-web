<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'

import PageActions from '@/components/PageActions.vue'
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

import { governanceApi } from '../api'
import type { SupportRepositoryResponse } from '../types'
import FilterField from './FilterField.vue'
import MetricCard from './MetricCard.vue'
import TablePager from '@/components/TablePager.vue'

const GBS_OPTIONS = ['All', 'GBS China', 'GBS India', 'GBS Philippines']
const CATEGORY_OPTIONS = [
  'All',
  'Communication',
  'Operational Support',
  'Quality Control',
  'Reporting',
  'Small Process',
  'Training',
  'Tool Support',
  'Project Support',
  'Performance Monitoring',
]
const TOOLKIT_OPTIONS = [
  'All',
  'Bank Rec Manual Check',
  'Bank Rec Auto Exception',
  'AP Classification Desk',
  'Booking Amendment Desk',
  'Blank Forms Desk',
]

const loading = ref(true)
const data = ref<SupportRepositoryResponse | null>(null)
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

const filteredRows = computed(() => {
  const rows = data.value?.rows ?? []
  return rows.filter((row) => {
    const gbsOk = gbsFilter.value === 'All' || row.gbsSite === gbsFilter.value
    const categoryOk =
      categoryFilter.value === 'All' || row.standardCategory === categoryFilter.value
    const toolkitOk = toolkitFilter.value === 'All' || row.toolkit === toolkitFilter.value
    const fromOk = !submittedFrom.value || row.submittedDate >= submittedFrom.value
    const toOk = !submittedTo.value || row.submittedDate <= submittedTo.value
    return gbsOk && categoryOk && toolkitOk && fromOk && toOk
  })
})

const safePage = computed(() =>
  Math.min(page.value, Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value) || 1)),
)
const visibleRows = computed(() => {
  const start = (safePage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const advancedFilterCount = computed(() => Number(Boolean(submittedFrom.value || submittedTo.value)))
const hasActiveFilters = computed(
  () =>
    gbsFilter.value !== 'All' ||
    categoryFilter.value !== 'All' ||
    toolkitFilter.value !== 'All' ||
    Boolean(submittedFrom.value || submittedTo.value),
)

function clearFilters() {
  gbsFilter.value = 'All'
  categoryFilter.value = 'All'
  toolkitFilter.value = 'All'
  submittedFrom.value = ''
  submittedTo.value = ''
  draftSubmittedFrom.value = ''
  draftSubmittedTo.value = ''
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
  page.value = 1
  moreFiltersOpen.value = false
}

function exportSupport() {
  toast.success('Export prepared (prototype)')
}

async function load() {
  loading.value = true
  try {
    data.value = await governanceApi.supportRepository()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load support repository.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageActions>
      <Button @click="exportSupport">Export Support Repository</Button>
    </PageActions>

    <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-wrap items-end gap-2.5">
        <FilterField label="GBS Center">
          <select
            v-model="gbsFilter"
            :class="[selectClass, 'w-[180px]']"
            @change="page = 1"
          >
            <option v-for="option in GBS_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </FilterField>
        <FilterField label="Standard Category">
          <select
            v-model="categoryFilter"
            :class="[selectClass, 'w-[200px]']"
            @change="page = 1"
          >
            <option v-for="option in CATEGORY_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </FilterField>
        <FilterField label="Toolkit">
          <select
            v-model="toolkitFilter"
            :class="[selectClass, 'w-[210px]']"
            @change="page = 1"
          >
            <option v-for="option in TOOLKIT_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </FilterField>
        <Button variant="outline" @click="toggleMoreFilters">
          More Filters{{ advancedFilterCount ? ` (${advancedFilterCount})` : '' }}
        </Button>
      </div>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="shrink-0 text-sm font-semibold text-primary"
        @click="clearFilters"
      >
        Clear All
      </button>
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
        @click="
          () => {
            submittedFrom = ''
            page = 1
          }
        "
      >
        Submitted after: {{ submittedFrom }} ×
      </button>
      <button
        v-if="submittedTo"
        type="button"
        class="rounded-full border bg-card px-2.5 py-1 text-xs"
        @click="
          () => {
            submittedTo = ''
            page = 1
          }
        "
      >
        Submitted before: {{ submittedTo }} ×
      </button>
    </div>

    <div v-if="loading" class="text-sm text-muted-foreground">Loading support repository…</div>

    <template v-else-if="data">
      <div class="grid gap-3 sm:grid-cols-2">
        <MetricCard label="Total support FTE" :value="data.totalSupportFte" />
        <MetricCard
          label="Top category"
          :value="data.topCategory"
          :hint="data.topCategoryFte"
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
                  <TableHead>Top activity example</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="row in data.categorySummaries"
                  :key="row.category"
                >
                  <TableCell>{{ row.category }}</TableCell>
                  <TableCell>{{ row.supportFte }}</TableCell>
                  <TableCell>{{ row.pctOfSupport }}</TableCell>
                  <TableCell>{{ row.topActivity }}</TableCell>
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
                  <TableHead>GBS Site</TableHead>
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
                <TableRow v-for="(row, index) in visibleRows" :key="`${row.exerciseNo}-${index}`">
                  <TableCell>{{ row.exerciseNo }}</TableCell>
                  <TableCell>{{ row.gbsSite }}</TableCell>
                  <TableCell>{{ row.domain }}</TableCell>
                  <TableCell>{{ row.pl3 }}</TableCell>
                  <TableCell>{{ row.toolkit }}</TableCell>
                  <TableCell>{{ row.standardCategory }}</TableCell>
                  <TableCell>{{ row.activity }}</TableCell>
                  <TableCell>{{ row.frequency }}</TableCell>
                  <TableCell>{{ row.volume }}</TableCell>
                  <TableCell>{{ row.uom }}</TableCell>
                  <TableCell>{{ row.fte }}</TableCell>
                  <TableCell>{{ row.comments }}</TableCell>
                </TableRow>
                <TableRow v-if="!visibleRows.length">
                  <TableCell colspan="12" class="h-24 text-center text-muted-foreground">
                    No support rows found.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <TablePager
            :total="filteredRows.length"
            :page="safePage"
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
