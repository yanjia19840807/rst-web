<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import TablePager from '@/components/TablePager.vue'
import { DataTable } from '@/components/ui/data-table'
import {
  createTmsSessionColumns,
  type TmsSessionTableRow,
} from '@/features/tms-management/components/tmsSessionColumns'

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

const rows = computed<TmsSessionTableRow[]>(() =>
  sessions.value.map((session) => toTmsSessionRow(session)),
)

const columns = computed(() =>
  createTmsSessionColumns({
    showActions: false,
    cycleTimeHeader: withUnit('Cycle Time', FieldUnit.seconds),
    cycleTimeWithUnit: false,
  }),
)

function toTmsSessionRow(session: ExerciseTmsSession): TmsSessionTableRow {
  return {
    id: session.sessionNo,
    agentName: session.agentName,
    toolkitName: session.toolkitName,
    subtaskName: session.subtaskName,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    netDurationSeconds: session.netDurationSeconds,
    processedVolume: session.processedVolume,
    reference: session.reference,
    remarks: session.remarks,
    cycleTimeSeconds: session.cycleTimeSeconds,
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

      <DataTable
        :columns="columns"
        :data="rows"
        :pending="loading"
        empty-text="No TMS sessions linked to this exercise."
        table-class="min-w-[1240px]"
        :get-row-id="(row) => row.id"
      >
        <template v-if="loadError" #empty>
          <span class="text-sm text-destructive">{{ loadError }}</span>
        </template>
      </DataTable>

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
