<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

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

import { approvalApi } from '../api'
import type { ApprovalQueueItem } from '../types'
import { formatDate } from '@/lib/datetime'

type TabKey = 'Awaiting Review' | 'Archived'

const router = useRouter()
const items = ref<ApprovalQueueItem[]>([])
const loading = ref(true)
const activeTab = ref<TabKey>('Awaiting Review')

const exerciseFilter = ref('')
const pl3Filter = ref('All PL3')
const toolkitFilter = ref('All toolkits')
const submittedFrom = ref('')
const submittedTo = ref('')
const draftSubmittedFrom = ref('')
const draftSubmittedTo = ref('')
const finalStatusFilter = ref('All statuses')
const archivedFrom = ref('')
const archivedTo = ref('')
const draftArchivedFrom = ref('')
const draftArchivedTo = ref('')
const moreFiltersOpen = ref(false)
const page = ref(1)
const pageSize = ref(10)

const tabs: TabKey[] = ['Awaiting Review', 'Archived']
const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

function toDateKey(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function finalStatusLabel(item: ApprovalQueueItem) {
  if (item.status === 'VALIDATED') return 'Approved'
  if (item.status === 'RETURNED' || item.status === 'ARCHIVED') return 'Rejected'
  return item.status
}

const pl3Options = computed(() => {
  const names = new Set(
    items.value.map((item) => item.pl3Name).filter((name): name is string => Boolean(name)),
  )
  return ['All PL3', ...Array.from(names).sort()]
})

const toolkitOptions = computed(() => {
  const names = new Set(
    items.value
      .map((item) => item.toolkitName)
      .filter((name): name is string => Boolean(name)),
  )
  return ['All toolkits', ...Array.from(names).sort()]
})

const filteredRows = computed(() =>
  items.value.filter((item) => {
    const codeOk = item.exerciseCode
      .toLowerCase()
      .includes(exerciseFilter.value.trim().toLowerCase())
    const pl3Ok = pl3Filter.value === 'All PL3' || item.pl3Name === pl3Filter.value
    const toolkitOk =
      toolkitFilter.value === 'All toolkits' || item.toolkitName === toolkitFilter.value
    if (!codeOk || !pl3Ok || !toolkitOk) return false

    if (activeTab.value === 'Awaiting Review') {
      const submitted = toDateKey(item.submittedAt)
      if (submittedFrom.value && submitted < submittedFrom.value) return false
      if (submittedTo.value && submitted > submittedTo.value) return false
      return true
    }

    if (finalStatusFilter.value !== 'All statuses') {
      if (finalStatusLabel(item) !== finalStatusFilter.value) return false
    }
    const archived = toDateKey(item.archivedAt ?? item.submittedAt)
    if (archivedFrom.value && (!archived || archived < archivedFrom.value)) return false
    if (archivedTo.value && (!archived || archived > archivedTo.value)) return false
    return true
  }),
)

const safePage = computed(() =>
  Math.min(page.value, Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value) || 1)),
)

const pagedRows = computed(() => {
  const start = (safePage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const advancedFilterCount = computed(() =>
  activeTab.value === 'Awaiting Review'
    ? Number(Boolean(submittedFrom.value || submittedTo.value))
    : Number(Boolean(archivedFrom.value || archivedTo.value)),
)

const hasActiveFilters = computed(() =>
  Boolean(
    exerciseFilter.value ||
      pl3Filter.value !== 'All PL3' ||
      toolkitFilter.value !== 'All toolkits' ||
      (activeTab.value === 'Awaiting Review' && (submittedFrom.value || submittedTo.value)) ||
      (activeTab.value === 'Archived' &&
        (finalStatusFilter.value !== 'All statuses' || archivedFrom.value || archivedTo.value)),
  ),
)

function resetPage() {
  page.value = 1
}

function toggleMoreFilters() {
  if (!moreFiltersOpen.value) {
    if (activeTab.value === 'Awaiting Review') {
      draftSubmittedFrom.value = submittedFrom.value
      draftSubmittedTo.value = submittedTo.value
    } else {
      draftArchivedFrom.value = archivedFrom.value
      draftArchivedTo.value = archivedTo.value
    }
  }
  moreFiltersOpen.value = !moreFiltersOpen.value
}

function clearAdvancedDraft() {
  if (activeTab.value === 'Awaiting Review') {
    draftSubmittedFrom.value = ''
    draftSubmittedTo.value = ''
  } else {
    draftArchivedFrom.value = ''
    draftArchivedTo.value = ''
  }
}

function applyAdvancedFilters() {
  if (activeTab.value === 'Awaiting Review') {
    submittedFrom.value = draftSubmittedFrom.value
    submittedTo.value = draftSubmittedTo.value
  } else {
    archivedFrom.value = draftArchivedFrom.value
    archivedTo.value = draftArchivedTo.value
  }
  resetPage()
  moreFiltersOpen.value = false
}

function clearFilters() {
  exerciseFilter.value = ''
  pl3Filter.value = 'All PL3'
  toolkitFilter.value = 'All toolkits'
  submittedFrom.value = ''
  submittedTo.value = ''
  draftSubmittedFrom.value = ''
  draftSubmittedTo.value = ''
  finalStatusFilter.value = 'All statuses'
  archivedFrom.value = ''
  archivedTo.value = ''
  draftArchivedFrom.value = ''
  draftArchivedTo.value = ''
  resetPage()
  moreFiltersOpen.value = false
}

async function load() {
  loading.value = true
  try {
    items.value = await approvalApi.queue({
      status: 'AWAITING',
      archived: activeTab.value === 'Archived',
    })
    resetPage()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load approval queue.')
  } finally {
    loading.value = false
  }
}

function openReview(item: ApprovalQueueItem) {
  void router.push({
    name: 'approver-review',
    params: { submissionId: item.submissionId },
  })
}

function onTabChange(tab: TabKey) {
  activeTab.value = tab
  exerciseFilter.value = ''
  moreFiltersOpen.value = false
  resetPage()
  void load()
}

watch([exerciseFilter, pl3Filter, toolkitFilter, finalStatusFilter], () => {
  resetPage()
})

onMounted(load)
</script>

<template>
  <Card>
    <CardHeader class="gap-3">
      <div class="flex gap-1 border-b">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          class="border-b-2 px-3.5 py-2 text-sm transition-colors"
          :class="
            activeTab === tab
              ? 'border-primary font-semibold text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          "
          @click="onTabChange(tab)"
        >
          {{ tab }}
        </button>
      </div>
      <div class="flex items-center justify-between gap-2">
        <CardTitle class="text-base">Approval Queue</CardTitle>
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
      <template v-if="activeTab === 'Awaiting Review'">
        <div class="flex flex-wrap items-end gap-2.5">
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Exercise Code
            <Input
              v-model="exerciseFilter" class="w-[210px]"
              placeholder="Search exercise code"
            />
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            PL3
            <select v-model="pl3Filter" :class="[selectClass, 'w-[210px]']">
              <option v-for="option in pl3Options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Toolkit
            <select v-model="toolkitFilter" :class="[selectClass, 'w-[210px]']">
              <option v-for="option in toolkitOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </label>
          <Button variant="outline" @click="toggleMoreFilters">
            More Filters{{ advancedFilterCount ? ` (${advancedFilterCount})` : '' }}
          </Button>
        </div>
        <div
          v-if="moreFiltersOpen"
          class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3"
        >
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Submitted Date From
            <DatePicker
              v-model="draftSubmittedFrom"
              aria-label="Submitted date from"
              placeholder="From"
              class="w-[180px]"
            />
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Submitted Date To
            <DatePicker
              v-model="draftSubmittedTo"
              aria-label="Submitted date to"
              placeholder="To"
              class="w-[180px]"
            />
          </label>
          <Button variant="outline" @click="clearAdvancedDraft">Clear</Button>
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
      </template>

      <template v-else>
        <div class="flex flex-wrap items-end gap-2.5">
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Exercise Code
            <Input
              v-model="exerciseFilter" class="w-[220px]"
              placeholder="Search exercise code"
            />
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            PL3
            <select v-model="pl3Filter" :class="[selectClass, 'w-[210px]']">
              <option v-for="option in pl3Options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Toolkit
            <select v-model="toolkitFilter" :class="[selectClass, 'w-[240px]']">
              <option v-for="option in toolkitOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Final Status
            <select v-model="finalStatusFilter" :class="[selectClass, 'w-[170px]']">
              <option>All statuses</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </label>
          <Button variant="outline" @click="toggleMoreFilters">
            More Filters{{ advancedFilterCount ? ` (${advancedFilterCount})` : '' }}
          </Button>
        </div>
        <div
          v-if="moreFiltersOpen"
          class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3"
        >
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Archived Date From
            <DatePicker
              v-model="draftArchivedFrom"
              aria-label="Archived date from"
              placeholder="From"
              class="w-[180px]"
            />
          </label>
          <label class="grid gap-1.5 text-xs text-muted-foreground">
            Archived Date To
            <DatePicker
              v-model="draftArchivedTo"
              aria-label="Archived date to"
              placeholder="To"
              class="w-[180px]"
            />
          </label>
          <Button variant="outline" @click="clearAdvancedDraft">Clear</Button>
          <Button @click="applyAdvancedFilters">Apply Filters</Button>
        </div>
      </template>

      <div class="overflow-x-auto rounded-lg border">
        <Table class="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Exercise</TableHead>
              <TableHead>PL3</TableHead>
              <TableHead>Toolkit</TableHead>
              <TableHead>Package Version</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Required Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead class="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in pagedRows" :key="item.submissionId">
              <TableCell>{{ item.exerciseCode }}</TableCell>
              <TableCell>{{ item.pl3Name || '—' }}</TableCell>
              <TableCell>{{ item.toolkitName || '—' }}</TableCell>
              <TableCell>{{ item.packageVersion }}</TableCell>
              <TableCell>{{ item.currentStep ?? '—' }}</TableCell>
              <TableCell>{{ item.requiredRole }}</TableCell>
              <TableCell>{{ item.status }}</TableCell>
              <TableCell>{{ formatDate(item.submittedAt) }}</TableCell>
              <TableCell class="text-right">
                <Button
                  size="sm"
                  variant="link"
                  class="h-auto px-0 font-semibold"
                  @click="openReview(item)"
                >
                  {{ activeTab === 'Awaiting Review' ? 'Review' : 'Open' }}
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="!loading && !pagedRows.length">
              <TableCell colspan="9" class="h-24 text-center text-muted-foreground">
                No {{ activeTab }} submissions.
              </TableCell>
            </TableRow>
            <TableRow v-if="loading">
              <TableCell colspan="9" class="h-24 text-center text-muted-foreground">
                Loading approval queue…
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <TablePager
        :total="filteredRows.length"
        :page="safePage"
        :page-size="pageSize"
        :label="activeTab === 'Awaiting Review' ? 'submitted records' : 'exercises'"
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
