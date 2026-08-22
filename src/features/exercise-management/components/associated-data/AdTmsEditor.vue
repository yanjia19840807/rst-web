<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import ListLoading from '@/components/ListLoading.vue'
import TablePager from '@/components/TablePager.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDuration } from '@/features/tms-management/composables/useTmsTimer'
import { formatDate } from '@/lib/datetime'

import { useExerciseTmsSessionsQuery } from '../../api/queries'
import { FieldUnit, withUnit } from '../../fieldUnits'
import type { CycleTimeBaseline, ExerciseTmsSession } from '../../types'
import AdMetric from './AdMetric.vue'
import { formatNumber } from './adTypes'

const props = defineProps<{
  exerciseId: string
  cycleTime: CycleTimeBaseline | null
  readOnly?: boolean
}>()

const page = ref(1)
const pageSize = ref(10)
const localCycleTime = ref<CycleTimeBaseline | null>(props.cycleTime)

watch(
  () => props.cycleTime,
  (value) => {
    localCycleTime.value = value
  },
)

const sessionsQuery = useExerciseTmsSessionsQuery(
  () => props.exerciseId,
  page,
  pageSize,
)
const sessions = computed(() => sessionsQuery.data.value?.items ?? [])
const total = computed(() => sessionsQuery.data.value?.total ?? 0)
const loading = computed(() => sessionsQuery.isPending.value && !sessionsQuery.data.value)
const loadError = computed(() => {
  if (!sessionsQuery.isError.value) return null
  return sessionsQuery.error.value instanceof Error
    ? sessionsQuery.error.value.message
    : 'Could not load TMS sessions.'
})

const medianLabel = computed(() =>
  localCycleTime.value ? Number(localCycleTime.value.medianSeconds).toFixed(2) : '—',
)

const sessionTotalLabel = computed(() => {
  if (localCycleTime.value?.sampleCount != null) {
    return formatNumber(localCycleTime.value.sampleCount)
  }
  if (loading.value) return '…'
  return total.value > 0 ? formatNumber(total.value) : '0'
})

const colCount = 11

function cycleTimeLabel(row: ExerciseTmsSession) {
  if (!row.processedVolume) return '—'
  if (row.cycleTimeSeconds != null) return String(row.cycleTimeSeconds)
  return String(Math.round(row.netDurationSeconds / row.processedVolume))
}

watch(
  () => props.exerciseId,
  () => {
    page.value = 1
  },
)

watch(
  () => ({
    totalPages: sessionsQuery.data.value?.totalPages,
    fetching: sessionsQuery.isFetching.value,
  }),
  ({ totalPages, fetching }) => {
    if (!fetching && totalPages != null && page.value > totalPages) {
      page.value = totalPages
    }
  },
)
</script>

<template>
  <div class="space-y-4">
    <div class="grid max-w-xl gap-3 sm:grid-cols-2">
      <AdMetric
        label="Sessions"
        :value="sessionTotalLabel"
        hint="Included sessions used for the SYSTEM median. Blank volume counts as one unit. When Combine subtask time is Yes, each subtask's median is summed."
      />
      <AdMetric
        :label="withUnit('Median cycle time', FieldUnit.seconds)"
        :value="medianLabel"
        hint="Baseline used for simulation"
      />
    </div>

    <section class="rounded-lg border bg-card p-4">
      <h3 class="mb-3 text-sm font-bold">TMS Sessions</h3>

      <div class="overflow-x-auto rounded-md border">
        <Table class="min-w-[1240px]">
          <TableHeader>
            <TableRow>
              <TableHead>Session No</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Toolkit</TableHead>
              <TableHead>Subtask</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>{{ withUnit('Cycle Time', FieldUnit.seconds) }}</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell :colspan="colCount" class="p-0">
                <ListLoading />
              </TableCell>
            </TableRow>
            <TableRow v-else-if="loadError">
              <TableCell
                :colspan="colCount"
                class="h-24 text-center text-sm text-destructive"
              >
                {{ loadError }}
              </TableCell>
            </TableRow>
            <TableRow v-else-if="sessions.length === 0">
              <TableCell
                :colspan="colCount"
                class="h-24 text-center text-muted-foreground"
              >
                No TMS sessions linked to this exercise.
              </TableCell>
            </TableRow>
            <TableRow v-for="row in sessions" :key="row.sessionNo">
              <TableCell class="font-mono text-xs">{{ row.sessionNo }}</TableCell>
              <TableCell>{{ row.agentName || '—' }}</TableCell>
              <TableCell>{{ row.toolkitName || '—' }}</TableCell>
              <TableCell>{{ row.subtaskName || '—' }}</TableCell>
              <TableCell>{{ formatDate(row.startedAt) }}</TableCell>
              <TableCell>{{ formatDate(row.endedAt) }}</TableCell>
              <TableCell>{{ formatDuration(row.netDurationSeconds) }}</TableCell>
              <TableCell>{{ cycleTimeLabel(row) }}</TableCell>
              <TableCell>{{ row.reference || '—' }}</TableCell>
              <TableCell>
                {{ row.processedVolume == null ? '—' : Number(row.processedVolume).toFixed(2) }}
              </TableCell>
              <TableCell class="max-w-52 truncate">{{ row.remarks || '—' }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <TablePager
        :total="total"
        :page="page"
        :page-size="pageSize"
        label="sessions"
        @update:page="page = $event"
        @update:page-size="
          (size) => {
            pageSize = size
            page = 1
          }
        "
      />
    </section>
  </div>
</template>
