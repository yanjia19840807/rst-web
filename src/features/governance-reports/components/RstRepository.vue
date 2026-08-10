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
import type { RepositoryRow } from '../types'
import CapacityCell from './CapacityCell.vue'
import FilterField from './FilterField.vue'
import TablePager from '@/components/TablePager.vue'

const GBS_OPTIONS = [
  'All',
  'GBS India',
  'GBS China',
  'GBS Philippines',
  'GBS Costa Rica',
  'GBS Lebanon',
  'GBS Estonia',
  'GBS Portugal',
]
const DOMAIN_OPTIONS = ['All', 'CUSTOMER CARE', 'FINANCE']
const PL3_OPTIONS = [
  'All',
  'BLANK FORMS',
  'BOOKING AMENDMENTS',
  'AP CLASSIFICATION',
  'BANK RECONCILIATION',
  'EXPORT DOC - STANDARD SCOPE',
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
const rows = ref<RepositoryRow[]>([])
const exerciseFilter = ref('')
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

const filteredRows = computed(() =>
  rows.value.filter((row) => {
    const exerciseOk = row.exerciseId
      .toLowerCase()
      .includes(exerciseFilter.value.trim().toLowerCase())
    const gbsOk =
      gbsFilter.value === 'All' ||
      row.country === gbsFilter.value ||
      row.country.includes(gbsFilter.value.replace('GBS ', ''))
    const domainOk = domainFilter.value === 'All' || row.domain === domainFilter.value
    const pl3Ok = pl3Filter.value === 'All' || row.pl3 === pl3Filter.value
    const toolkitOk = toolkitFilter.value === 'All' || row.toolkit === toolkitFilter.value
    const fromOk = !submittedFrom.value || row.submittedDate >= submittedFrom.value
    const toOk = !submittedTo.value || row.submittedDate <= submittedTo.value
    return exerciseOk && gbsOk && domainOk && pl3Ok && toolkitOk && fromOk && toOk
  }),
)

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
    Boolean(exerciseFilter.value) ||
    gbsFilter.value !== 'All' ||
    domainFilter.value !== 'All' ||
    pl3Filter.value !== 'All' ||
    toolkitFilter.value !== 'All' ||
    Boolean(submittedFrom.value || submittedTo.value),
)

function resetPage() {
  page.value = 1
}

function clearFilters() {
  exerciseFilter.value = ''
  gbsFilter.value = 'All'
  domainFilter.value = 'All'
  pl3Filter.value = 'All'
  toolkitFilter.value = 'All'
  submittedFrom.value = ''
  submittedTo.value = ''
  draftSubmittedFrom.value = ''
  draftSubmittedTo.value = ''
  resetPage()
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

async function load() {
  loading.value = true
  try {
    rows.value = await governanceApi.repository()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load repository.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageActions>
      <Button @click="exportRepo">Export Repository</Button>
    </PageActions>

    <Card>
      <CardHeader>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-baseline gap-2">
            <CardTitle class="text-base">Repository Table</CardTitle>
            <span class="text-xs text-muted-foreground">{{ filteredRows.length }} records</span>
          </div>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="text-sm font-semibold text-primary"
            @click="clearFilters"
          >
            Clear All
          </button>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap items-end gap-2.5">
          <FilterField label="Exercise No">
            <Input
              v-model="exerciseFilter" class="w-[200px]"
              placeholder="Search exercise no"
              @update:model-value="resetPage"
            />
          </FilterField>
          <FilterField label="GBS Center">
            <select v-model="gbsFilter" :class="[selectClass, 'w-[180px]']" @change="resetPage">
              <option v-for="option in GBS_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Domain">
            <select v-model="domainFilter" :class="[selectClass, 'w-[160px]']" @change="resetPage">
              <option v-for="option in DOMAIN_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="PL3">
            <select v-model="pl3Filter" :class="[selectClass, 'w-[210px]']" @change="resetPage">
              <option v-for="option in PL3_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Toolkit">
            <select v-model="toolkitFilter" :class="[selectClass, 'w-[210px]']" @change="resetPage">
              <option v-for="option in TOOLKIT_OPTIONS" :key="option" :value="option">
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
            @click="
              () => {
                submittedFrom = ''
                resetPage()
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
                resetPage()
              }
            "
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
                <TableHead>Shared KPI Line</TableHead>
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
                <TableCell colspan="16" class="h-24 text-center text-muted-foreground">
                  Loading repository…
                </TableCell>
              </TableRow>
              <template v-else>
                <TableRow
                  v-for="(row, index) in visibleRows"
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
                  <TableCell>{{ row.deliveryHc }}</TableCell>
                  <TableCell>{{ row.rsHc }}</TableCell>
                  <TableCell>{{ row.support }}</TableCell>
                  <TableCell>
                    <CapacityCell :value="row.capacityCreation" />
                  </TableCell>
                  <TableCell>{{ row.capacityPct }}</TableCell>
                  <TableCell>{{ row.volumeYoY }}</TableCell>
                </TableRow>
                <TableRow v-if="!visibleRows.length">
                  <TableCell colspan="16" class="h-24 text-center text-muted-foreground">
                    No repository records found.
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>

        <TablePager
          :total="filteredRows.length"
          :page="safePage"
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
