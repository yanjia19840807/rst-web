<script setup lang="ts">
import ListLoading from '@/components/ListLoading.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/datetime'

import type { Exercise } from '../types'
import { exerciseStatusLabel, nextStepLabel } from '../workflowLabels'

type TabKey = 'Active' | 'Archived'

const props = defineProps<{
  activeTab: TabKey
  rows: Exercise[]
  loading: boolean
}>()

const emit = defineEmits<{
  open: [exercise: Exercise]
  withdraw: [exercise: Exercise]
}>()

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

const colspan = () => (props.activeTab === 'Active' ? 13 : 11)
</script>

<template>
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
        <TableRow v-for="exercise in rows" :key="exercise.id">
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
                @click="emit('withdraw', exercise)"
              >
                Withdraw
              </Button>
              <Button
                size="sm"
                variant="link"
                class="h-auto px-0 font-semibold"
                @click="emit('open', exercise)"
              >
                Open
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-if="!loading && !rows.length">
          <TableCell :colspan="colspan()" class="h-24 text-center text-muted-foreground">
            No {{ activeTab }} exercises.
          </TableCell>
        </TableRow>
        <TableRow v-if="loading">
          <TableCell :colspan="colspan()" class="p-0">
            <ListLoading />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
