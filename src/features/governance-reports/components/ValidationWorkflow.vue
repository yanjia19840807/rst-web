<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'

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

import { governanceApi } from '../api'
import type { ValidationWorkflowRow } from '../types'
import CapacityCell from './CapacityCell.vue'
import FilterField from './FilterField.vue'
import TablePager from '@/components/TablePager.vue'

const GBS_OPTIONS = ['All', 'GBS China', 'GBS Philippines', 'GBS Portugal', 'GBS India']
const DOMAIN_OPTIONS = ['All', 'FINANCE', 'CUSTOMER CARE']
const PL3_OPTIONS = [
  'All',
  'BANK RECONCILIATION',
  'BOOKING AMENDMENTS',
  'BLANK FORMS',
  'AP CLASSIFICATION',
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
const rows = ref<ValidationWorkflowRow[]>([])
const exerciseFilter = ref('')
const gbsFilter = ref('All')
const domainFilter = ref('All')
const pl3Filter = ref('All')
const toolkitFilter = ref('All')
const agingMaxDays = ref('')
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
    const exerciseOk = row.exerciseNo
      .toLowerCase()
      .includes(exerciseFilter.value.trim().toLowerCase())
    const gbsOk = gbsFilter.value === 'All' || row.gbs === gbsFilter.value
    const domainOk = domainFilter.value === 'All' || row.domain === domainFilter.value
    const pl3Ok = pl3Filter.value === 'All' || row.pl3 === pl3Filter.value
    const toolkitOk = toolkitFilter.value === 'All' || row.toolkit === toolkitFilter.value
    const agingOk =
      !agingMaxDays.value || row.agingDays <= Number.parseInt(agingMaxDays.value, 10)
    const fromOk = !submittedFrom.value || row.submittedDate >= submittedFrom.value
    const toOk = !submittedTo.value || row.submittedDate <= submittedTo.value
    return exerciseOk && gbsOk && domainOk && pl3Ok && toolkitOk && agingOk && fromOk && toOk
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
    Boolean(agingMaxDays.value) ||
    Boolean(submittedFrom.value || submittedTo.value),
)

function agingVariant(days: number): 'secondary' | 'destructive' {
  return days >= 14 ? 'destructive' : 'secondary'
}

function clearFilters() {
  exerciseFilter.value = ''
  gbsFilter.value = 'All'
  domainFilter.value = 'All'
  pl3Filter.value = 'All'
  toolkitFilter.value = 'All'
  agingMaxDays.value = ''
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

async function load() {
  loading.value = true
  try {
    rows.value = await governanceApi.validationWorkflow()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load validation workflow.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-3 flex justify-end">
      <Badge variant="secondary">Reminder handled outside the tool</Badge>
    </div>

    <Card>
      <CardHeader>
        <div class="flex items-center justify-between gap-3">
          <CardTitle class="text-base">RST Stuck In Validation</CardTitle>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="shrink-0 text-sm font-semibold text-primary"
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
              v-model="exerciseFilter" class="w-[180px]"
              placeholder="Search exercise no"
              @update:model-value="page = 1"
            />
          </FilterField>
          <FilterField label="GBS Center">
            <select v-model="gbsFilter" :class="[selectClass, 'w-[170px]']" @change="page = 1">
              <option v-for="option in GBS_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Domain">
            <select v-model="domainFilter" :class="[selectClass, 'w-[150px]']" @change="page = 1">
              <option v-for="option in DOMAIN_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="PL3">
            <select v-model="pl3Filter" :class="[selectClass, 'w-[200px]']" @change="page = 1">
              <option v-for="option in PL3_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Toolkit">
            <select v-model="toolkitFilter" :class="[selectClass, 'w-[200px]']" @change="page = 1">
              <option v-for="option in TOOLKIT_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </FilterField>
          <FilterField label="Aging (max days)">
            <Input
              v-model="agingMaxDays"
              type="number"
              min="0" class="w-[110px]"
              placeholder="e.g. 14"
              @update:model-value="page = 1"
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
                <TableCell colspan="11" class="h-24 text-center text-muted-foreground">
                  Loading validation workflow…
                </TableCell>
              </TableRow>
              <template v-else>
                <TableRow v-for="row in visibleRows" :key="row.exerciseNo">
                  <TableCell>{{ row.exerciseNo }}</TableCell>
                  <TableCell>{{ row.gbs }}</TableCell>
                  <TableCell>{{ row.domain }}</TableCell>
                  <TableCell>{{ row.pl3 }}</TableCell>
                  <TableCell>{{ row.toolkit }}</TableCell>
                  <TableCell>{{ row.currentStep }}</TableCell>
                  <TableCell>{{ row.currentOwner }}</TableCell>
                  <TableCell>
                    <Badge :variant="agingVariant(row.agingDays)">{{ row.agingDays }} days</Badge>
                  </TableCell>
                  <TableCell>
                    <CapacityCell :value="row.capacityCreation" />
                  </TableCell>
                  <TableCell>{{ row.capacityPct }}</TableCell>
                  <TableCell>{{ row.volumeYoY }}</TableCell>
                </TableRow>
                <TableRow v-if="!visibleRows.length">
                  <TableCell colspan="11" class="h-24 text-center text-muted-foreground">
                    No stuck exercises found.
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
