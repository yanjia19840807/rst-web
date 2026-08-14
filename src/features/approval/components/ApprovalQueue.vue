<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'

import TablePager from '@/components/TablePager.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import AdMetric from '@/features/exercise-management/components/associated-data/AdMetric.vue'
import ToolkitInfoDialog from '@/features/exercise-management/components/ToolkitInfoDialog.vue'
import { exerciseApi } from '@/features/exercise-management/api'
import type { Exercise } from '@/features/exercise-management/types'
import { formatDateTime } from '@/lib/datetime'

import { approvalApi } from '../api'
import type { ApprovalQueueItem, ApprovalQueueMetrics } from '../types'

type TabKey = 'Awaiting Review' | 'Completed Task'

const router = useRouter()
const items = ref<ApprovalQueueItem[]>([])
const loading = ref(true)
const activeTab = ref<TabKey>('Awaiting Review')
const metrics = ref<ApprovalQueueMetrics>({
  awaitingMe: 0,
  overdue: 0,
  dueWithin2Days: 0,
  highRisk: 0,
})
const toolkitNames = ref<string[]>([])
const pl3Names = ref<string[]>([])

const exerciseFilter = ref('')
const pl3Filter = ref('All PL3')
const toolkitFilter = ref('All toolkits')
const submittedFrom = ref('')
const submittedTo = ref('')
const draftSubmittedFrom = ref('')
const draftSubmittedTo = ref('')
const decisionFilter = ref('All decisions')
const completedFrom = ref('')
const completedTo = ref('')
const draftCompletedFrom = ref('')
const draftCompletedTo = ref('')
const moreFiltersOpen = ref(false)
const page = ref(1)
const pageSize = ref(10)
const toolkitInfoOpen = ref(false)
const toolkitSnapshot = ref<Exercise['snapshot'] | null>(null)

const tabs: TabKey[] = ['Awaiting Review', 'Completed Task']
const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

function formatHc(value?: number | string | null) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(1)
}

function formatSigned(value?: number | string | null) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`
}

function capacityTone(value?: number | string | null) {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n < 0 ? 'text-destructive font-semibold' : 'text-emerald-600 font-semibold'
}

function agingTone(days?: number | null) {
  if (days == null) return 'neutral' as const
  if (days >= 5) return 'bad' as const
  if (days >= 3) return 'warn' as const
  return 'neutral' as const
}

function previousStepLabel(step?: string | null) {
  const value = step?.trim()
  if (!value || value === 'Submitted') return '—'
  return value
}

function decisionTone(decision?: string | null) {
  if (decision === 'Returned') return 'bad' as const
  if (decision === 'Approved') return 'good' as const
  return 'muted' as const
}

const pl3Options = computed(() => ['All PL3', ...pl3Names.value])

const toolkitOptions = computed(() => ['All toolkits', ...toolkitNames.value])

const safePage = computed(() =>
  Math.min(page.value, Math.max(1, Math.ceil(items.value.length / pageSize.value) || 1)),
)

const pagedRows = computed(() => {
  const start = (safePage.value - 1) * pageSize.value
  return items.value.slice(start, start + pageSize.value)
})

const advancedFilterCount = computed(() =>
  activeTab.value === 'Awaiting Review'
    ? Number(Boolean(submittedFrom.value || submittedTo.value))
    : Number(Boolean(completedFrom.value || completedTo.value)),
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
      draftCompletedFrom.value = completedFrom.value
      draftCompletedTo.value = completedTo.value
    }
  }
  moreFiltersOpen.value = !moreFiltersOpen.value
}

function clearAdvancedDraft() {
  if (activeTab.value === 'Awaiting Review') {
    draftSubmittedFrom.value = ''
    draftSubmittedTo.value = ''
  } else {
    draftCompletedFrom.value = ''
    draftCompletedTo.value = ''
  }
}

function applyAdvancedFilters() {
  if (activeTab.value === 'Awaiting Review') {
    submittedFrom.value = draftSubmittedFrom.value
    submittedTo.value = draftSubmittedTo.value
  } else {
    completedFrom.value = draftCompletedFrom.value
    completedTo.value = draftCompletedTo.value
  }
  resetPage()
  moreFiltersOpen.value = false
}

async function load() {
  loading.value = true
  try {
    const completed = activeTab.value === 'Completed Task'
    const view = await approvalApi.queue({
      status: 'AWAITING',
      completed,
      exerciseCode: exerciseFilter.value,
      toolkitName: toolkitFilter.value === 'All toolkits' ? undefined : toolkitFilter.value,
      pl3Name: pl3Filter.value === 'All PL3' ? undefined : pl3Filter.value,
      submittedFrom: completed ? undefined : submittedFrom.value || undefined,
      submittedTo: completed ? undefined : submittedTo.value || undefined,
      completedFrom: completed ? completedFrom.value || undefined : undefined,
      completedTo: completed ? completedTo.value || undefined : undefined,
      decision:
        !completed || decisionFilter.value === 'All decisions'
          ? undefined
          : decisionFilter.value,
    })
    items.value = view.items
    metrics.value = view.metrics
    toolkitNames.value = view.toolkitNames
    pl3Names.value = view.pl3Names
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

async function openToolkit(item: ApprovalQueueItem) {
  if (!item.exerciseId) return
  try {
    const exercise = await exerciseApi.detail(item.exerciseId)
    toolkitSnapshot.value = exercise.snapshot
    toolkitInfoOpen.value = true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load toolkit info.')
  }
}

function onTabChange(tab: TabKey) {
  activeTab.value = tab
  exerciseFilter.value = ''
  toolkitFilter.value = 'All toolkits'
  pl3Filter.value = 'All PL3'
  submittedFrom.value = ''
  submittedTo.value = ''
  draftSubmittedFrom.value = ''
  draftSubmittedTo.value = ''
  decisionFilter.value = 'All decisions'
  completedFrom.value = ''
  completedTo.value = ''
  draftCompletedFrom.value = ''
  draftCompletedTo.value = ''
  moreFiltersOpen.value = false
  resetPage()
}

watch(
  [
    activeTab,
    toolkitFilter,
    pl3Filter,
    decisionFilter,
    submittedFrom,
    submittedTo,
    completedFrom,
    completedTo,
  ],
  () => {
    resetPage()
    void load()
  },
  { immediate: true },
)

watchDebounced(
  exerciseFilter,
  () => {
    resetPage()
    void load()
  },
  { debounce: 400 },
)
</script>

<template>
  <div class="grid gap-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AdMetric label="Awaiting Me" :value="String(metrics.awaitingMe)" hint="Current approval step" />
      <AdMetric label="Overdue" :value="String(metrics.overdue)" hint="Aging 5 days or more" />
      <AdMetric
        label="Due Within 2 Days"
        :value="String(metrics.dueWithin2Days)"
        hint="Approaching review target"
      />
      <AdMetric
        label="High-risk Submissions"
        :value="String(metrics.highRisk)"
        hint="Requires priority review"
      />
    </div>

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
      </CardHeader>
      <CardContent class="space-y-3">
        <template v-if="activeTab === 'Awaiting Review'">
          <div class="flex flex-wrap items-end gap-2.5">
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Exercise Code
              <Input
                v-model="exerciseFilter"
                class="w-[210px]"
                placeholder="Search exercise code"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Toolkit
              <select v-model="toolkitFilter" :class="[selectClass, 'w-[210px]']">
                <option v-for="option in toolkitOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              PL3
              <select v-model="pl3Filter" :class="[selectClass, 'w-[210px]']">
                <option v-for="option in pl3Options" :key="option" :value="option">
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
        </template>

        <template v-else>
          <div class="flex flex-wrap items-end gap-2.5">
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Exercise Code
              <Input
                v-model="exerciseFilter"
                class="w-[220px]"
                placeholder="Search exercise code"
              />
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
              PL3
              <select v-model="pl3Filter" :class="[selectClass, 'w-[210px]']">
                <option v-for="option in pl3Options" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              My Decision
              <select v-model="decisionFilter" :class="[selectClass, 'w-[170px]']">
                <option>All decisions</option>
                <option>Approved</option>
                <option>Returned</option>
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
              Completed Date From
              <DatePicker
                v-model="draftCompletedFrom"
                aria-label="Completed date from"
                placeholder="From"
                class="w-[180px]"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Completed Date To
              <DatePicker
                v-model="draftCompletedTo"
                aria-label="Completed date to"
                placeholder="To"
                class="w-[180px]"
              />
            </label>
            <Button variant="outline" @click="clearAdvancedDraft">Clear</Button>
            <Button @click="applyAdvancedFilters">Apply Filters</Button>
          </div>
        </template>

        <div class="overflow-x-auto rounded-lg border">
          <Table v-if="activeTab === 'Awaiting Review'" class="min-w-[1520px]">
            <TableHeader>
              <TableRow>
                <TableHead>Exercise code</TableHead>
                <TableHead>GBS</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>PL3</TableHead>
                <TableHead>Toolkit</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead>Delivery HC</TableHead>
                <TableHead>Right Sizing HC</TableHead>
                <TableHead>Production Support</TableHead>
                <TableHead>Capacity Creation</TableHead>
                <TableHead>Previous Step</TableHead>
                <TableHead>Previous Actor</TableHead>
                <TableHead>Previous Step At</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in pagedRows" :key="item.submissionId">
                <TableCell class="font-semibold">{{ item.exerciseCode }}</TableCell>
                <TableCell>{{ item.center || '—' }}</TableCell>
                <TableCell>{{ item.domain || '—' }}</TableCell>
                <TableCell>{{ item.pl3Name || '—' }}</TableCell>
                <TableCell>
                  <span class="inline-flex items-center gap-1.5">
                    <span>{{ item.toolkitName || '—' }}</span>
                    <button
                      v-if="item.exerciseId && item.toolkitName"
                      type="button"
                      class="inline-flex size-5 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/10"
                      title="Toolkit info"
                      @click="openToolkit(item)"
                    >
                      <Info class="size-3.5" />
                      <span class="sr-only">Toolkit info</span>
                    </button>
                  </span>
                </TableCell>
                <TableCell>{{ item.supervisor || '—' }}</TableCell>
                <TableCell>{{ formatDateTime(item.submittedAt) }}</TableCell>
                <TableCell>{{ formatHc(item.deliveryHc) }}</TableCell>
                <TableCell>{{ formatHc(item.rightSizingHc) }}</TableCell>
                <TableCell>{{ formatHc(item.productionSupport) }}</TableCell>
                <TableCell :class="capacityTone(item.capacityCreation)">
                  {{ formatSigned(item.capacityCreation) }}
                </TableCell>
                <TableCell>{{ previousStepLabel(item.previousStep) }}</TableCell>
                <TableCell>{{ item.previousActor || '—' }}</TableCell>
                <TableCell>{{ formatDateTime(item.previousStepAt) }}</TableCell>
                <TableCell>
                  <Badge
                    :variant="agingTone(item.agingDays) === 'bad' ? 'destructive' : 'outline'"
                    :class="{
                      'border-amber-200 bg-amber-50 text-amber-800':
                        agingTone(item.agingDays) === 'warn',
                    }"
                  >
                    {{ item.agingDays ?? 0 }}
                    {{ item.agingDays === 1 ? 'day' : 'days' }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    @click="openReview(item)"
                  >
                    Review
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="!loading && !pagedRows.length">
                <TableCell colspan="16" class="h-24 text-center text-muted-foreground">
                  No submitted records found.
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell colspan="16" class="h-24 text-center text-muted-foreground">
                  Loading approval queue…
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Table v-else class="min-w-[1320px]">
            <TableHeader>
              <TableRow>
                <TableHead>Exercise code</TableHead>
                <TableHead>GBS</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>PL3</TableHead>
                <TableHead>Toolkit</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead>Delivery HC</TableHead>
                <TableHead>Right Sizing HC</TableHead>
                <TableHead>Production Support</TableHead>
                <TableHead>Capacity Creation</TableHead>
                <TableHead>My Decision</TableHead>
                <TableHead>Completed On</TableHead>
                <TableHead>Completed Step</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in pagedRows" :key="item.submissionId">
                <TableCell class="font-semibold">{{ item.exerciseCode }}</TableCell>
                <TableCell>{{ item.center || '—' }}</TableCell>
                <TableCell>{{ item.domain || '—' }}</TableCell>
                <TableCell>{{ item.pl3Name || '—' }}</TableCell>
                <TableCell>
                  <span class="inline-flex items-center gap-1.5">
                    <span>{{ item.toolkitName || '—' }}</span>
                    <button
                      v-if="item.exerciseId && item.toolkitName"
                      type="button"
                      class="inline-flex size-5 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/10"
                      title="Toolkit info"
                      @click="openToolkit(item)"
                    >
                      <Info class="size-3.5" />
                      <span class="sr-only">Toolkit info</span>
                    </button>
                  </span>
                </TableCell>
                <TableCell>{{ item.supervisor || '—' }}</TableCell>
                <TableCell>{{ formatDateTime(item.submittedAt) }}</TableCell>
                <TableCell>{{ formatHc(item.deliveryHc) }}</TableCell>
                <TableCell>{{ formatHc(item.rightSizingHc) }}</TableCell>
                <TableCell>{{ formatHc(item.productionSupport) }}</TableCell>
                <TableCell :class="capacityTone(item.capacityCreation)">
                  {{ formatSigned(item.capacityCreation) }}
                </TableCell>
                <TableCell>
                  <Badge
                    :variant="decisionTone(item.myDecision) === 'bad' ? 'destructive' : 'outline'"
                    :class="{
                      'border-emerald-200 bg-emerald-50 text-emerald-700':
                        decisionTone(item.myDecision) === 'good',
                    }"
                  >
                    {{ item.myDecision || '—' }}
                  </Badge>
                </TableCell>
                <TableCell>{{ formatDateTime(item.myCompletedAt) }}</TableCell>
                <TableCell>{{ item.completedStep || '—' }}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="link"
                    class="h-auto px-0 font-semibold"
                    @click="openReview(item)"
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="!loading && !pagedRows.length">
                <TableCell colspan="15" class="h-24 text-center text-muted-foreground">
                  No completed tasks found.
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell colspan="15" class="h-24 text-center text-muted-foreground">
                  Loading approval queue…
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <TablePager
          :total="items.length"
          :page="safePage"
          :page-size="pageSize"
          :label="activeTab === 'Awaiting Review' ? 'submitted records' : 'completed tasks'"
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
