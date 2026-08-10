<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
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
import type { SupervisorToolkit } from '@/features/toolkit-management/types'

import { exerciseApi } from '../api'
import type { Exercise, WorkflowStatus } from '../types'
import CreateExerciseDialog from './CreateExerciseDialog.vue'

type TabKey = 'In Progress' | 'Under Review' | 'Archived'
type OfficialScenarioFilter = 'All scenarios' | 'Assigned' | 'Not assigned'

const route = useRoute()
const router = useRouter()
const exercises = ref<Exercise[]>([])
const toolkits = ref<SupervisorToolkit[]>([])
const loading = ref(true)
const activeTab = ref<TabKey>('In Progress')
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
const reviewStatusFilter = ref('All statuses')
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
const draftReviewStatus = ref('All statuses')
const draftSubmittedFrom = ref('')
const draftSubmittedTo = ref('')
const draftArchivedFrom = ref('')
const draftArchivedTo = ref('')
const page = ref(1)
const pageSize = ref(10)

const tabs: TabKey[] = ['In Progress', 'Under Review', 'Archived']
const selectClass =
  'h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

const inProgressStatuses: WorkflowStatus[] = ['IN_PROGRESS', 'RETURNED']
const underReviewStatuses: WorkflowStatus[] = ['UNDER_REVIEW']
const archivedStatuses: WorkflowStatus[] = ['VALIDATED', 'ARCHIVED']

const pl3Options = computed(() => {
  const names = new Set(toolkits.value.map((item) => item.pl3Name))
  for (const exercise of exercises.value) {
    names.add(exercise.snapshot.toolkit.pl3Name)
  }
  return ['All PL3', ...Array.from(names).filter(Boolean).sort()]
})

const toolkitOptions = computed(() => {
  const names = new Set(toolkits.value.map((item) => item.name))
  for (const exercise of exercises.value) {
    names.add(exercise.snapshot.toolkit.name)
  }
  return ['All toolkits', ...Array.from(names).sort()]
})

function toDateKey(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function matchesPl3(exercise: Exercise) {
  return (
    pl3Filter.value === 'All PL3' || exercise.snapshot.toolkit.pl3Name === pl3Filter.value
  )
}

function matchesToolkit(exercise: Exercise) {
  return (
    toolkitFilter.value === 'All toolkits' ||
    exercise.snapshot.toolkit.name === toolkitFilter.value
  )
}

function matchesExerciseCode(exercise: Exercise) {
  return exercise.exerciseCode
    .toLowerCase()
    .includes(exerciseCodeFilter.value.trim().toLowerCase())
}

function matchesOfficialScenario(exercise: Exercise) {
  if (officialScenarioFilter.value === 'All scenarios') return true
  const assigned = Boolean(exercise.officialScenarioId)
  return officialScenarioFilter.value === 'Assigned' ? assigned : !assigned
}

function finalStatusLabel(exercise: Exercise) {
  if (exercise.workflowStatus === 'VALIDATED') return 'Approved'
  if (exercise.workflowStatus === 'ARCHIVED') return 'Rejected'
  return exercise.workflowStatus
}

const tabRows = computed(() => {
  if (activeTab.value === 'In Progress') {
    return exercises.value.filter((item) => inProgressStatuses.includes(item.workflowStatus))
  }
  if (activeTab.value === 'Under Review') {
    return exercises.value.filter((item) => underReviewStatuses.includes(item.workflowStatus))
  }
  return exercises.value.filter((item) => archivedStatuses.includes(item.workflowStatus))
})

const filteredRows = computed(() => {
  return tabRows.value.filter((exercise) => {
    if (!matchesPl3(exercise) || !matchesToolkit(exercise) || !matchesExerciseCode(exercise)) {
      return false
    }

    if (activeTab.value === 'In Progress') {
      const created = toDateKey(exercise.createdAt)
      if (createdFrom.value && created < createdFrom.value) return false
      if (createdTo.value && created > createdTo.value) return false
      return matchesOfficialScenario(exercise)
    }

    if (activeTab.value === 'Under Review') {
      // Review Stage / Reviewer / Status keep prototype UI; list API has no fields yet.
      const submitted = toDateKey(exercise.submittedAt)
      if (submittedFrom.value && (!submitted || submitted < submittedFrom.value)) return false
      if (submittedTo.value && (!submitted || submitted > submittedTo.value)) return false
      return true
    }

    if (finalStatusFilter.value !== 'All statuses') {
      if (finalStatusLabel(exercise) !== finalStatusFilter.value) return false
    }
    const archived = toDateKey(exercise.submittedAt)
    if (archivedFrom.value && (!archived || archived < archivedFrom.value)) return false
    if (archivedTo.value && (!archived || archived > archivedTo.value)) return false
    return true
  })
})

const safePage = computed(() =>
  Math.min(page.value, Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value) || 1)),
)

const pagedRows = computed(() => {
  const start = (safePage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

function resetPage() {
  page.value = 1
}

const advancedCount = computed(() => {
  if (activeTab.value === 'In Progress') {
    return (
      Number(Boolean(createdFrom.value || createdTo.value)) +
      Number(officialScenarioFilter.value !== 'All scenarios')
    )
  }
  if (activeTab.value === 'Under Review') {
    return (
      Number(Boolean(submittedFrom.value || submittedTo.value)) +
      Number(reviewerFilter.value !== 'All reviewers') +
      Number(reviewStatusFilter.value !== 'All statuses')
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
      (activeTab.value === 'Under Review' && reviewStageFilter.value !== 'All stages') ||
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
    if (activeTab.value === 'In Progress') {
      draftCreatedFrom.value = createdFrom.value
      draftCreatedTo.value = createdTo.value
      draftOfficialScenario.value = officialScenarioFilter.value
    } else if (activeTab.value === 'Under Review') {
      draftSubmittedFrom.value = submittedFrom.value
      draftSubmittedTo.value = submittedTo.value
      draftReviewer.value = reviewerFilter.value
      draftReviewStatus.value = reviewStatusFilter.value
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
  if (activeTab.value === 'In Progress') {
    draftCreatedFrom.value = ''
    draftCreatedTo.value = ''
    draftOfficialScenario.value = 'All scenarios'
  } else if (activeTab.value === 'Under Review') {
    draftSubmittedFrom.value = ''
    draftSubmittedTo.value = ''
    draftReviewer.value = 'All reviewers'
    draftReviewStatus.value = 'All statuses'
  } else {
    draftArchivedFrom.value = ''
    draftArchivedTo.value = ''
  }
}

function applyAdvanced() {
  if (activeTab.value === 'In Progress') {
    createdFrom.value = draftCreatedFrom.value
    createdTo.value = draftCreatedTo.value
    officialScenarioFilter.value = draftOfficialScenario.value
  } else if (activeTab.value === 'Under Review') {
    submittedFrom.value = draftSubmittedFrom.value
    submittedTo.value = draftSubmittedTo.value
    reviewerFilter.value = draftReviewer.value
    reviewStatusFilter.value = draftReviewStatus.value
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
  if (activeTab.value === 'In Progress') {
    createdFrom.value = ''
    createdTo.value = ''
    officialScenarioFilter.value = 'All scenarios'
  } else if (activeTab.value === 'Under Review') {
    reviewStageFilter.value = 'All stages'
    reviewerFilter.value = 'All reviewers'
    reviewStatusFilter.value = 'All statuses'
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
    ;[exercises.value, toolkits.value] = await Promise.all([
      exerciseApi.list(),
      exerciseApi.toolkits(),
    ])
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
  exercises.value.unshift(exercise)
  activeTab.value = 'In Progress'
  if (route.query.create || route.query.toolkitId) {
    void router.replace({ name: 'supervisor-exercises' })
  }
  void router.push({ name: 'supervisor-exercise-detail', params: { id: exercise.id } })
}

function openExercise(exercise: Exercise) {
  if (exercise.workflowStatus === 'UNDER_REVIEW' && exercise.submittedAt) {
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

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function deliveryHc(exercise: Exercise) {
  return exercise.snapshot.sharedKpis
    .reduce((sum, item) => sum + Number(item.deliveryHc), 0)
    .toFixed(1)
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
    exerciseCodeFilter,
    pl3Filter,
    toolkitFilter,
    reviewStageFilter,
    finalStatusFilter,
  ],
  () => {
    resetPage()
  },
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
        <!-- In Progress filters -->
        <template v-if="activeTab === 'In Progress'">
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
            <Button variant="outline" @click="toggleAdvanced">
              More Filters{{ advancedCount ? ` (${advancedCount})` : '' }}
            </Button>
          </div>
          <div
            v-if="advancedOpen === 'In Progress'"
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
            <Button variant="outline" @click="clearAdvancedDrafts">Clear</Button>
            <Button @click="applyAdvanced">Apply Filters</Button>
          </div>
        </template>

        <!-- Under Review filters -->
        <template v-else-if="activeTab === 'Under Review'">
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
            v-if="advancedOpen === 'Under Review'"
            class="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted p-3"
          >
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Current Reviewer
              <select v-model="draftReviewer" :class="[selectClass, 'w-[180px]']">
                <option>All reviewers</option>
                <option>Grace Li</option>
                <option>Ramesh Kumar</option>
                <option>Allen HE</option>
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
            <label class="grid gap-1.5 text-xs text-muted-foreground">
              Status
              <select v-model="draftReviewStatus" :class="[selectClass, 'w-[210px]']">
                <option>All statuses</option>
                <option>Pending Review</option>
                <option>Awaiting Final Approval</option>
              </select>
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
          <Table class="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Exercise Code</TableHead>
                <TableHead>GBS</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>PL3</TableHead>
                <TableHead>Toolkit</TableHead>
                <TableHead>Sizing Month</TableHead>
                <TableHead>Created</TableHead>
                <TableHead v-if="activeTab === 'Under Review'">Submitted</TableHead>
                <TableHead>Delivery HC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="exercise in pagedRows" :key="exercise.id">
                <TableCell>{{ exercise.exerciseCode }}</TableCell>
                <TableCell>{{ exercise.snapshot.toolkit.center }}</TableCell>
                <TableCell>{{ exercise.snapshot.toolkit.domain }}</TableCell>
                <TableCell>{{ exercise.snapshot.toolkit.pl3Name }}</TableCell>
                <TableCell>{{ exercise.snapshot.toolkit.name }}</TableCell>
                <TableCell>{{ exercise.sizingMonth }}</TableCell>
                <TableCell>{{ formatDate(exercise.createdAt) }}</TableCell>
                <TableCell v-if="activeTab === 'Under Review'">
                  {{ formatDate(exercise.submittedAt) }}
                </TableCell>
                <TableCell>{{ deliveryHc(exercise) }}</TableCell>
                <TableCell>{{ exercise.workflowStatus }}</TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-3">
                    <Button
                      v-if="activeTab === 'Under Review'"
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
                  :colspan="activeTab === 'Under Review' ? 11 : 10"
                  class="h-24 text-center text-muted-foreground"
                >
                  No {{ activeTab }} exercises.
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell
                  :colspan="activeTab === 'Under Review' ? 11 : 10"
                  class="h-24 text-center text-muted-foreground"
                >
                  Loading exercises…
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <TablePager
          :total="filteredRows.length"
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
