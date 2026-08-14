<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { watchDebounced } from '@vueuse/core'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageActions from '@/components/PageActions.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import type { SupervisorToolkit } from '@/features/toolkit-management/types'
import { toolkitApi } from '@/features/toolkit-management/api'

import { exerciseApi } from '../api'
import type { Exercise, ExerciseListQuery } from '../types'
import CreateExerciseDialog from './CreateExerciseDialog.vue'
import { formatDate } from '@/lib/datetime'
import { exerciseStatusLabel, nextStepLabel } from '../workflowLabels'

type TabKey = 'Active' | 'Archived'
type OfficialScenarioFilter = 'All scenarios' | 'Assigned' | 'Not assigned'
type ProgressStatusFilter = 'All statuses' | 'In Progress' | 'Returned' | 'Under Review'

const route = useRoute()
const router = useRouter()
const exercises = ref<Exercise[]>([])
const toolkits = ref<SupervisorToolkit[]>([])
const toolkitNames = ref<string[]>([])
const pl3Names = ref<string[]>([])
const reviewerNames = ref<string[]>([])
const loading = ref(true)
const activeTab = ref<TabKey>('Active')
const createOpen = ref(false)
const initialToolkitId = ref<string | undefined>()
const withdrawOpen = ref(false)
const withdrawPending = ref(false)
const withdrawTarget = ref<Exercise | null>(null)

const exerciseCodeFilter = ref('')
const pl3Filter = ref('All PL3')
const toolkitFilter = ref('All toolkits')
const createdFrom = ref('')
const createdTo = ref('')
const officialScenarioFilter = ref<OfficialScenarioFilter>('All scenarios')
const reviewStageFilter = ref('All stages')
const reviewerFilter = ref('All reviewers')
const statusFilter = ref<ProgressStatusFilter>('All statuses')
const submittedFrom = ref('')
const submittedTo = ref('')
const finalStatusFilter = ref('All statuses')
const archivedFrom = ref('')
const archivedTo = ref('')
const advancedOpen = ref<TabKey | null>(null)

const draftCreatedFrom = ref('')
const draftCreatedTo = ref('')
const draftOfficialScenario = ref<OfficialScenarioFilter>('All scenarios')
const draftReviewer = ref('All reviewers')
const draftSubmittedFrom = ref('')
const draftSubmittedTo = ref('')
const draftArchivedFrom = ref('')
const draftArchivedTo = ref('')
const page = ref(1)
const pageSize = ref(10)

const tabs: TabKey[] = ['Active', 'Archived']
const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const pl3Options = computed(() => ['All PL3', ...pl3Names.value])
const toolkitOptions = computed(() => ['All toolkits', ...toolkitNames.value])
const reviewerOptions = computed(() => ['All reviewers', ...reviewerNames.value])

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

function deliveryHc(exercise: Exercise) {
  if (exercise.deliveryHc != null && exercise.deliveryHc !== '') {
    return formatHc(exercise.deliveryHc)
  }
  return exercise.snapshot.sharedKpis
    .reduce((sum, item) => sum + Number(item.deliveryHc), 0)
    .toFixed(1)
}

const safePage = computed(() =>
  Math.min(page.value, Math.max(1, Math.ceil(exercises.value.length / pageSize.value) || 1)),
)

const pagedRows = computed(() => {
  const start = (safePage.value - 1) * pageSize.value
  return exercises.value.slice(start, start + pageSize.value)
})

function resetPage() {
  page.value = 1
}

const advancedCount = computed(() => {
  if (activeTab.value === 'Active') {
    return (
      Number(Boolean(createdFrom.value || createdTo.value)) +
      Number(officialScenarioFilter.value !== 'All scenarios') +
      Number(reviewerFilter.value !== 'All reviewers') +
      Number(Boolean(submittedFrom.value || submittedTo.value))
    )
  }
  return Number(Boolean(archivedFrom.value || archivedTo.value))
})

const hasCurrentFilters = computed(() =>
  Boolean(
    exerciseCodeFilter.value ||
      pl3Filter.value !== 'All PL3' ||
      toolkitFilter.value !== 'All toolkits' ||
      advancedCount.value ||
      (activeTab.value === 'Active' && statusFilter.value !== 'All statuses') ||
      (activeTab.value === 'Active' && reviewStageFilter.value !== 'All stages') ||
      (activeTab.value === 'Archived' && finalStatusFilter.value !== 'All statuses'),
  ),
)

function switchTab(tab: TabKey) {
  activeTab.value = tab
  exerciseCodeFilter.value = ''
  advancedOpen.value = null
  resetPage()
}

function toggleAdvanced() {
  if (advancedOpen.value !== activeTab.value) {
    if (activeTab.value === 'Active') {
      draftCreatedFrom.value = createdFrom.value
      draftCreatedTo.value = createdTo.value
      draftOfficialScenario.value = officialScenarioFilter.value
      draftReviewer.value = reviewerFilter.value
      draftSubmittedFrom.value = submittedFrom.value
      draftSubmittedTo.value = submittedTo.value
    } else {
      draftArchivedFrom.value = archivedFrom.value
      draftArchivedTo.value = archivedTo.value
    }
    advancedOpen.value = activeTab.value
  } else {
    advancedOpen.value = null
  }
}

function clearAdvancedDrafts() {
  if (activeTab.value === 'Active') {
    draftCreatedFrom.value = ''
    draftCreatedTo.value = ''
    draftOfficialScenario.value = 'All scenarios'
    draftReviewer.value = 'All reviewers'
    draftSubmittedFrom.value = ''
    draftSubmittedTo.value = ''
  } else {
    draftArchivedFrom.value = ''
    draftArchivedTo.value = ''
  }
}

function applyAdvanced() {
  if (activeTab.value === 'Active') {
    createdFrom.value = draftCreatedFrom.value
    createdTo.value = draftCreatedTo.value
    officialScenarioFilter.value = draftOfficialScenario.value
    reviewerFilter.value = draftReviewer.value
    submittedFrom.value = draftSubmittedFrom.value
    submittedTo.value = draftSubmittedTo.value
  } else {
    archivedFrom.value = draftArchivedFrom.value
    archivedTo.value = draftArchivedTo.value
  }
  resetPage()
  advancedOpen.value = null
}

function clearCurrentFilters() {
  exerciseCodeFilter.value = ''
  pl3Filter.value = 'All PL3'
  toolkitFilter.value = 'All toolkits'
  if (activeTab.value === 'Active') {
    statusFilter.value = 'All statuses'
    createdFrom.value = ''
    createdTo.value = ''
    officialScenarioFilter.value = 'All scenarios'
    reviewStageFilter.value = 'All stages'
    reviewerFilter.value = 'All reviewers'
    submittedFrom.value = ''
    submittedTo.value = ''
  } else {
    finalStatusFilter.value = 'All statuses'
    archivedFrom.value = ''
    archivedTo.value = ''
  }
  resetPage()
  advancedOpen.value = null
}

async function load() {
  loading.value = true
  try {
    const inProgress = activeTab.value === 'Active'
    const query: ExerciseListQuery = {
      tab: inProgress ? 'IN_PROGRESS' : 'ARCHIVED',
      exerciseCode: exerciseCodeFilter.value,
      toolkitName: toolkitFilter.value === 'All toolkits' ? undefined : toolkitFilter.value,
      pl3Name: pl3Filter.value === 'All PL3' ? undefined : pl3Filter.value,
      workflowStatus: inProgress
        ? statusFilter.value === 'Returned'
          ? 'RETURNED'
          : statusFilter.value === 'Under Review'
            ? 'UNDER_REVIEW'
            : statusFilter.value === 'In Progress'
              ? 'IN_PROGRESS'
              : undefined
        : finalStatusFilter.value === 'Approved'
          ? 'VALIDATED'
          : finalStatusFilter.value === 'Rejected'
            ? 'ARCHIVED'
            : undefined,
      reviewStage: !inProgress || reviewStageFilter.value === 'All stages'
        ? undefined
        : reviewStageFilter.value === 'Manager Review'
          ? 'MANAGER'
          : reviewStageFilter.value === 'Center Delivery Head Review'
            ? 'CDH'
            : reviewStageFilter.value === 'Local Transformation Head Review'
              ? 'LTH'
              : undefined,
      handler: !inProgress || reviewerFilter.value === 'All reviewers'
        ? undefined
        : reviewerFilter.value,
      officialScenario: !inProgress || officialScenarioFilter.value === 'All scenarios'
        ? undefined
        : officialScenarioFilter.value === 'Assigned'
          ? 'ASSIGNED'
          : 'UNASSIGNED',
      createdFrom: inProgress ? createdFrom.value || undefined : undefined,
      createdTo: inProgress ? createdTo.value || undefined : undefined,
      submittedFrom: inProgress ? submittedFrom.value || undefined : undefined,
      submittedTo: inProgress ? submittedTo.value || undefined : undefined,
      archivedFrom: inProgress ? undefined : archivedFrom.value || undefined,
      archivedTo: inProgress ? undefined : archivedTo.value || undefined,
    }
    const [view, toolkitList] = await Promise.all([
      exerciseApi.list(query),
      toolkits.value.length ? Promise.resolve(toolkits.value) : toolkitApi.list().then((view) => view.items),
    ])
    exercises.value = view.items
    toolkitNames.value = view.toolkitNames
    pl3Names.value = view.pl3Names
    reviewerNames.value = view.reviewerNames
    if (!toolkits.value.length) {
      toolkits.value = toolkitList
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load exercises.')
  } finally {
    loading.value = false
  }
}

function openCreate(toolkitId?: string) {
  initialToolkitId.value = toolkitId
  createOpen.value = true
}

function onCreated(exercise: Exercise) {
  activeTab.value = 'Active'
  if (route.query.create || route.query.toolkitId) {
    void router.replace({ name: 'supervisor-exercises' })
  }
  void router.push({ name: 'supervisor-exercise-detail', params: { id: exercise.id } })
}

function openExercise(exercise: Exercise) {
  if (exercise.submittedAt || exercise.workflowStatus !== 'IN_PROGRESS') {
    void router.push({ name: 'supervisor-submission', params: { id: exercise.id } })
    return
  }
  void router.push({ name: 'supervisor-exercise-detail', params: { id: exercise.id } })
}

function askWithdraw(exercise: Exercise) {
  withdrawTarget.value = exercise
  withdrawOpen.value = true
}

async function confirmWithdraw() {
  if (!withdrawTarget.value || withdrawPending.value) return
  withdrawPending.value = true
  try {
    await exerciseApi.withdraw(withdrawTarget.value.id)
    toast.success('Submission withdrawn.')
    withdrawOpen.value = false
    withdrawTarget.value = null
    await load()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not withdraw submission.')
  } finally {
    withdrawPending.value = false
  }
}

function reviewStage(exercise: Exercise) {
  if (exercise.workflowStatus !== 'UNDER_REVIEW') return '—'
  return nextStepLabel(exercise.requiredRole)
}

function currentReviewerName(exercise: Exercise) {
  if (exercise.workflowStatus !== 'UNDER_REVIEW') return '—'
  return exercise.currentReviewer || '—'
}

function activeStatusLabel(exercise: Exercise) {
  switch (exercise.workflowStatus) {
    case 'UNDER_REVIEW':
      return 'Under Review'
    case 'RETURNED':
      return 'Returned'
    default:
      return 'In Progress'
  }
}

watch(
  () => [route.query.create, route.query.toolkitId] as const,
  ([create, toolkitId]) => {
    if (create === '1') {
      openCreate(typeof toolkitId === 'string' ? toolkitId : undefined)
    }
  },
  { immediate: true },
)

watch(
  [
    activeTab,
    pl3Filter,
    toolkitFilter,
    reviewStageFilter,
    statusFilter,
    finalStatusFilter,
    createdFrom,
    createdTo,
    officialScenarioFilter,
    reviewerFilter,
    submittedFrom,
    submittedTo,
    archivedFrom,
    archivedTo,
  ],
  () => {
    resetPage()
    void load()
  },
)

watchDebounced(
  exerciseCodeFilter,
  () => {
    resetPage()
    void load()
  },
  { debounce: 400 },
)

onMounted(load)
</script>

<template>
  <div class="grid gap-4">
    <PageActions>
      <Button @click="openCreate()">Create New Exercise</Button>
    </PageActions>

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
            @click="switchTab(tab)"
          >
            {{ tab }}
          </button>
        </div>
        <div class="flex items-center justify-between gap-2">
          <CardTitle class="text-base">Exercises</CardTitle>
          <button
            v-if="hasCurrentFilters"
            type="button"
            class="text-sm font-semibold text-primary"
            @click="clearCurrentFilters"
          >
            Clear All
          </button>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        <!-- Active filters -->
        <template v-if="activeTab === 'Active'">
          <div class="flex flex-wrap items-end gap-2.5">
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Exercise Code
              <Input
                v-model="exerciseCodeFilter" class="w-[220px]"
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
              Status
              <select v-model="statusFilter" :class="[selectClass, 'w-[170px]']">
                <option>All statuses</option>
                <option>In Progress</option>
                <option>Returned</option>
                <option>Under Review</option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Review Stage
              <select v-model="reviewStageFilter" :class="[selectClass, 'w-[260px]']">
                <option>All stages</option>
                <option>Manager Review</option>
                <option>Center Delivery Head Review</option>
                <option>Local Transformation Head Review</option>
              </select>
            </label>
            <Button variant="outline" @click="toggleAdvanced">
              More Filters{{ advancedCount ? ` (${advancedCount})` : '' }}
            </Button>
          </div>
          <div
            v-if="advancedOpen === 'Active'"
            class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3"
          >
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Created Date From
              <DatePicker
                v-model="draftCreatedFrom"
                aria-label="Created date from"
                placeholder="From"
                class="w-[180px]"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Created Date To
              <DatePicker
                v-model="draftCreatedTo"
                aria-label="Created date to"
                placeholder="To"
                class="w-[180px]"
              />
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Official Scenario
              <select v-model="draftOfficialScenario" :class="[selectClass, 'w-[170px]']">
                <option value="All scenarios">All scenarios</option>
                <option value="Assigned">Assigned</option>
                <option value="Not assigned">Not assigned</option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Handler
              <select v-model="draftReviewer" :class="[selectClass, 'w-[180px]']">
                <option v-for="option in reviewerOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
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
            <Button variant="outline" @click="clearAdvancedDrafts">Clear</Button>
            <Button @click="applyAdvanced">Apply Filters</Button>
          </div>
        </template>

        <!-- Archived filters -->
        <template v-else>
          <div class="flex flex-wrap items-end gap-2.5">
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Exercise Code
              <Input
                v-model="exerciseCodeFilter" class="w-[220px]"
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
            <Button variant="outline" @click="toggleAdvanced">
              More Filters{{ advancedCount ? ` (${advancedCount})` : '' }}
            </Button>
          </div>
          <div
            v-if="advancedOpen === 'Archived'"
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
            <Button variant="outline" @click="clearAdvancedDrafts">Clear</Button>
            <Button @click="applyAdvanced">Apply Filters</Button>
          </div>
        </template>

        <div class="overflow-x-auto rounded-lg border">
          <Table :class="activeTab === 'Active' ? 'min-w-[1280px]' : 'min-w-[1200px]'">
            <TableHeader>
              <TableRow v-if="activeTab === 'Active'">
                <TableHead>Exercise Code</TableHead>
                <TableHead>Toolkit</TableHead>
                <TableHead>Delivery HC</TableHead>
                <TableHead>Right Sizing HC</TableHead>
                <TableHead>Production Support</TableHead>
                <TableHead>Capacity Creation</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead>Review Stage</TableHead>
                <TableHead>Current Reviewer</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
              <TableRow v-else>
                <TableHead>Exercise Code</TableHead>
                <TableHead>Toolkit</TableHead>
                <TableHead>Delivery HC</TableHead>
                <TableHead>Right Sizing HC</TableHead>
                <TableHead>Production Support</TableHead>
                <TableHead>Capacity Creation</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead>Archived Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="exercise in pagedRows" :key="exercise.id">
                <template v-if="activeTab === 'Active'">
                  <TableCell>{{ exercise.exerciseCode }}</TableCell>
                  <TableCell>{{ exercise.snapshot.toolkit.name }}</TableCell>
                  <TableCell>{{ deliveryHc(exercise) }}</TableCell>
                  <TableCell>{{ formatHc(exercise.rightSizingHc) }}</TableCell>
                  <TableCell>{{ formatHc(exercise.productionSupport) }}</TableCell>
                  <TableCell :class="capacityTone(exercise.capacityCreation)">
                    {{ formatSigned(exercise.capacityCreation) }}
                  </TableCell>
                  <TableCell>{{ formatDate(exercise.createdAt) }}</TableCell>
                  <TableCell>{{ formatDate(exercise.submittedAt) }}</TableCell>
                  <TableCell>{{ reviewStage(exercise) }}</TableCell>
                  <TableCell>{{ currentReviewerName(exercise) }}</TableCell>
                  <TableCell>
                    <Badge
                      v-if="exercise.agingDays != null"
                      :variant="agingTone(exercise.agingDays) === 'bad' ? 'destructive' : 'outline'"
                      :class="{
                        'border-amber-200 bg-amber-50 text-amber-800':
                          agingTone(exercise.agingDays) === 'warn',
                      }"
                    >
                      {{ exercise.agingDays }}
                      {{ exercise.agingDays === 1 ? 'day' : 'days' }}
                    </Badge>
                    <span v-else>—</span>
                  </TableCell>
                  <TableCell :title="exercise.lastDecisionComment || undefined">
                    {{ activeStatusLabel(exercise) }}
                  </TableCell>
                </template>
                <template v-else>
                  <TableCell>{{ exercise.exerciseCode }}</TableCell>
                  <TableCell>{{ exercise.snapshot.toolkit.name }}</TableCell>
                  <TableCell>{{ deliveryHc(exercise) }}</TableCell>
                  <TableCell>{{ formatHc(exercise.rightSizingHc) }}</TableCell>
                  <TableCell>{{ formatHc(exercise.productionSupport) }}</TableCell>
                  <TableCell :class="capacityTone(exercise.capacityCreation)">
                    {{ formatSigned(exercise.capacityCreation) }}
                  </TableCell>
                  <TableCell>{{ formatDate(exercise.createdAt) }}</TableCell>
                  <TableCell>{{ formatDate(exercise.submittedAt) }}</TableCell>
                  <TableCell>{{ formatDate(exercise.archivedAt) }}</TableCell>
                  <TableCell :title="exercise.lastDecisionComment || undefined">
                    {{ exerciseStatusLabel(exercise) }}
                  </TableCell>
                </template>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-3">
                    <Button
                      v-if="exercise.workflowStatus === 'UNDER_REVIEW'"
                      size="sm"
                      variant="link-destructive"
                      class="h-auto px-0 font-semibold"
                      @click="askWithdraw(exercise)"
                    >
                      Withdraw
                    </Button>
                    <Button
                      size="sm"
                      variant="link"
                      class="h-auto px-0 font-semibold"
                      @click="openExercise(exercise)"
                    >
                      Open
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="!loading && !pagedRows.length">
                <TableCell
                  :colspan="activeTab === 'Active' ? 13 : 11"
                  class="h-24 text-center text-muted-foreground"
                >
                  No {{ activeTab }} exercises.
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell
                  :colspan="activeTab === 'Active' ? 13 : 11"
                  class="h-24 text-center text-muted-foreground"
                >
                  Loading exercises…
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <TablePager
          :total="exercises.length"
          :page="safePage"
          :page-size="pageSize"
          label="exercises"
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

    <CreateExerciseDialog
      v-model:open="createOpen"
      :toolkits="toolkits"
      :initial-toolkit-id="initialToolkitId"
      @created="onCreated"
    />

    <ConfirmDialog
      v-model:open="withdrawOpen"
      title="Withdraw Submission"
      description="Withdraw this Under Review submission and reopen the exercise for editing."
      confirm-label="Withdraw"
      :rows="
        withdrawTarget
          ? [
              { label: 'Exercise', value: withdrawTarget.exerciseCode, strong: true },
              { label: 'Toolkit', value: withdrawTarget.snapshot.toolkit.name },
              { label: 'Submitted', value: formatDate(withdrawTarget.submittedAt) },
            ]
          : []
      "
      :pending="withdrawPending"
      @confirm="confirmWithdraw"
    />
  </div>
</template>
