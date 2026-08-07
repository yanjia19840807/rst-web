<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const tabs: TabKey[] = ['In Progress', 'Under Review', 'Archived']

const inProgressStatuses: WorkflowStatus[] = ['IN_PROGRESS', 'RETURNED']
const underReviewStatuses: WorkflowStatus[] = ['UNDER_REVIEW']
const archivedStatuses: WorkflowStatus[] = ['VALIDATED', 'ARCHIVED']

const filteredRows = computed(() => {
  if (activeTab.value === 'In Progress') {
    return exercises.value.filter((item) => inProgressStatuses.includes(item.workflowStatus))
  }
  if (activeTab.value === 'Under Review') {
    return exercises.value.filter((item) => underReviewStatuses.includes(item.workflowStatus))
  }
  return exercises.value.filter((item) => archivedStatuses.includes(item.workflowStatus))
})

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
            @click="activeTab = tab"
          >
            {{ tab }}
          </button>
        </div>
        <div class="flex items-center justify-between gap-2">
          <CardTitle class="text-base">Exercises</CardTitle>
          <span class="text-xs text-muted-foreground">{{ filteredRows.length }} records</span>
        </div>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto rounded-lg border">
          <Table class="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Exercise Code</TableHead>
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
              <TableRow v-for="exercise in filteredRows" :key="exercise.id">
                <TableCell class="font-semibold">{{ exercise.exerciseCode }}</TableCell>
                <TableCell>{{ exercise.snapshot.toolkit.name }}</TableCell>
                <TableCell>{{ exercise.sizingMonth }}</TableCell>
                <TableCell>{{ formatDate(exercise.createdAt) }}</TableCell>
                <TableCell v-if="activeTab === 'Under Review'">
                  {{ formatDate(exercise.submittedAt) }}
                </TableCell>
                <TableCell>{{ deliveryHc(exercise) }}</TableCell>
                <TableCell>{{ exercise.workflowStatus }}</TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-2">
                    <Button
                      v-if="activeTab === 'Under Review'"
                      size="sm"
                      variant="outline"
                      @click="askWithdraw(exercise)"
                    >
                      Withdraw
                    </Button>
                    <Button size="sm" variant="outline" @click="openExercise(exercise)">
                      Open
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="!loading && !filteredRows.length">
                <TableCell
                  :colspan="activeTab === 'Under Review' ? 8 : 7"
                  class="h-24 text-center text-muted-foreground"
                >
                  No {{ activeTab }} exercises.
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell
                  :colspan="activeTab === 'Under Review' ? 8 : 7"
                  class="h-24 text-center text-muted-foreground"
                >
                  Loading exercises…
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
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
