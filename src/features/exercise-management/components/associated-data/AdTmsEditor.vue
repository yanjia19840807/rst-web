<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ListLoading from '@/components/ListLoading.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useExerciseAssociatedDataMutations } from '../../api/mutations'
import { useExerciseTmsSessionsQuery } from '../../api/queries'
import type { CycleTimeBaseline, ExerciseTmsSession, TeamSetup } from '../../types'
import AdMetric from './AdMetric.vue'
import { formatNumber } from './adTypes'

const props = defineProps<{
  exerciseId: string
  cycleTime: CycleTimeBaseline | null
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:cycleTime': [value: CycleTimeBaseline]
  'update:teamSetup': [value: TeamSetup]
}>()

const { patchTmsSession } = useExerciseAssociatedDataMutations()
const page = ref(1)
const pageSize = ref(10)
const busySessionNo = ref<string | null>(null)
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
  localCycleTime.value ? `${Number(localCycleTime.value.medianSeconds).toFixed(2)}s` : '—',
)

const sessionTotalLabel = computed(() => {
  if (localCycleTime.value?.sampleCount != null) {
    return formatNumber(localCycleTime.value.sampleCount)
  }
  if (loading.value) return '…'
  return total.value > 0 ? formatNumber(total.value) : '0'
})

function formatZScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(2)
}

async function toggleIncluded(row: ExerciseTmsSession) {
  if (props.readOnly || busySessionNo.value) return
  busySessionNo.value = row.sessionNo
  try {
    const result = await patchTmsSession.mutateAsync({
      exerciseId: props.exerciseId,
      sessionNo: row.sessionNo,
      included: !row.included,
    })
    if (result.baseline) {
      localCycleTime.value = result.baseline
      emit('update:cycleTime', result.baseline)
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not update session inclusion.')
  } finally {
    busySessionNo.value = null
  }
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
        hint="Included samples for the SYSTEM median. Same Reference is summed when Combine same-reference session time is Yes."
      />
      <AdMetric
        label="Median cycle time"
        :value="medianLabel"
        hint="Baseline used for simulation"
      />
    </div>

    <section class="rounded-lg border bg-card p-4">
      <h3 class="mb-3 text-base font-bold">TMS Sessions</h3>

      <div class="overflow-x-auto rounded-md border">
        <Table class="min-w-[880px]">
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Subtask</TableHead>
              <TableHead>Cycle time</TableHead>
              <TableHead>Z-Score</TableHead>
              <TableHead v-if="!readOnly" class="w-[120px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell :colspan="readOnly ? 6 : 7" class="p-0">
                <ListLoading />
              </TableCell>
            </TableRow>
            <TableRow v-else-if="loadError">
              <TableCell
                :colspan="readOnly ? 6 : 7"
                class="h-24 text-center text-sm text-destructive"
              >
                {{ loadError }}
              </TableCell>
            </TableRow>
            <TableRow v-else-if="sessions.length === 0">
              <TableCell
                :colspan="readOnly ? 6 : 7"
                class="h-24 text-center text-sm text-muted-foreground italic"
              >
                No TMS sessions linked to this exercise.
              </TableCell>
            </TableRow>
            <TableRow
              v-for="row in sessions"
              :key="row.sessionNo"
              :class="row.included ? undefined : 'text-muted-foreground'"
            >
              <TableCell class="font-mono text-xs">{{ row.sessionNo }}</TableCell>
              <TableCell>{{ row.reference || '—' }}</TableCell>
              <TableCell>{{ row.agentName || '—' }}</TableCell>
              <TableCell>{{ row.subtaskName || '—' }}</TableCell>
              <TableCell>
                {{ row.cycleTimeSeconds != null ? `${Number(row.cycleTimeSeconds).toFixed(2)}s` : '—' }}
              </TableCell>
              <TableCell
                :class="
                  row.zScore != null && row.zScore > 2 ? 'font-medium text-amber-700' : undefined
                "
              >
                {{ formatZScore(row.zScore) }}
              </TableCell>
              <TableCell v-if="!readOnly">
                <Button
                  size="sm"
                  variant="link"
                  class="h-auto px-0"
                  :class="row.included ? undefined : 'text-amber-600 hover:text-amber-700'"
                  :disabled="busySessionNo === row.sessionNo"
                  @click="toggleIncluded(row)"
                >
                  {{ row.included ? 'Exclude' : 'Restore' }}
                </Button>
              </TableCell>
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
