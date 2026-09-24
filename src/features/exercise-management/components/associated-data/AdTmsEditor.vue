<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import TablePager from '@/components/TablePager.vue'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import {
  createTmsSessionColumns,
  type TmsSessionTableRow,
} from '@/features/tms-management/components/tmsSessionColumns'
import { showOperationNotices } from '@/composables/useOperationNotices'
import { formatCivilDate } from '@/lib/datetime'

import { useExerciseMutations } from '../../api/mutations'
import { useExerciseTmsSessionsQuery } from '../../api/queries'
import { FieldUnit, withUnit } from '../../fieldUnits'
import { tmsPeriodSchema } from '../../schemas/exercisePeriods'
import { tmsRatioDescription, tmsRatioLabel } from '../../tmsRatio'
import type { CycleTimeBaseline, ExerciseTmsSession } from '../../types'
import AdMetric from './AdMetric.vue'
import { formatNumber } from './adTypes'

const props = defineProps<{
  exerciseId: string
  tmsFrom: string | null
  tmsTo: string | null
  cycleTime: CycleTimeBaseline | null
  medianSourceLabel?: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  written: []
}>()

const { updateTmsPeriod, clearTmsPeriod } = useExerciseMutations()
const draftTmsFrom = ref(props.tmsFrom ?? '')
const draftTmsTo = ref(props.tmsTo ?? '')
const confirmPeriodOpen = ref(false)
const confirmClearPeriodOpen = ref(false)
const busyAction = ref<'period' | 'clear-period' | null>(null)
const page = ref(1)
const pageSize = ref(10)
const localCycleTime = ref<CycleTimeBaseline | null>(props.cycleTime)

watch(
  () => props.cycleTime,
  (value) => {
    localCycleTime.value = value
  },
)

watch(
  () => [props.tmsFrom, props.tmsTo] as const,
  ([from, to]) => {
    draftTmsFrom.value = from ?? ''
    draftTmsTo.value = to ?? ''
  },
)

const periodSet = computed(() => Boolean(props.tmsFrom && props.tmsTo))
const periodReady = computed(() => Boolean(draftTmsFrom.value && draftTmsTo.value))
const busy = computed(() => busyAction.value != null)

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

const tmsRatioMetric = computed(() => tmsRatioLabel(localCycleTime.value?.tmsRatio))
const tmsRatioHint = computed(() => tmsRatioDescription(localCycleTime.value?.tmsRatio))

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

async function withBusy(action: 'period' | 'clear-period', work: () => Promise<void>) {
  busyAction.value = action
  try {
    await work()
  } finally {
    busyAction.value = null
  }
}

function requestApplyPeriod() {
  if (props.readOnly || busy.value) return
  const parsed = tmsPeriodSchema.safeParse({
    tmsFrom: draftTmsFrom.value,
    tmsTo: draftTmsTo.value,
  })
  if (!parsed.success) {
    toast.warning(parsed.error.issues[0]?.message ?? 'Please complete the TMS period.')
    return
  }
  if (periodSet.value) {
    confirmPeriodOpen.value = true
    return
  }
  void applyPeriod()
}

async function applyPeriod() {
  if (props.readOnly || busy.value) return
  try {
    await withBusy('period', async () => {
      const result = await updateTmsPeriod.mutateAsync({
        id: props.exerciseId,
        body: {
          tmsFrom: draftTmsFrom.value,
          tmsTo: draftTmsTo.value,
        },
      })
      confirmPeriodOpen.value = false
      const summary = 'TMS period applied.'
      const shown = showOperationNotices({
        summary,
        notices: result.notices ?? [],
      })
      if (!shown) toast.success(summary)
      emit('written')
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not apply TMS period.')
  }
}

function requestClearPeriod() {
  if (props.readOnly || busy.value || !periodSet.value) return
  confirmClearPeriodOpen.value = true
}

async function clearPeriod() {
  if (props.readOnly || busy.value || !periodSet.value) return
  try {
    await withBusy('clear-period', async () => {
      const result = await clearTmsPeriod.mutateAsync(props.exerciseId)
      draftTmsFrom.value = ''
      draftTmsTo.value = ''
      confirmClearPeriodOpen.value = false
      const summary = 'TMS period cleared.'
      const shown = showOperationNotices({
        summary,
        notices: result.notices ?? [],
      })
      if (!shown) toast.success(summary)
      emit('written')
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not clear TMS period.')
  }
}
</script>

<template>
  <div class="space-y-4 rounded-lg border bg-card p-4">
    <DetailTable
      v-if="readOnly"
      :columns="2"
      :rows="[
        { label: 'Median source', value: medianSourceLabel || 'System-calculated median' },
        { label: 'From', value: formatCivilDate(tmsFrom) },
        { label: 'To', value: formatCivilDate(tmsTo) },
      ]"
    />
    <template v-else>
      <Label>TMS period</Label>
      <div class="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 px-3 py-3">
        <div class="grid gap-1.5">
          <span class="text-xs text-muted-foreground">From</span>
          <DatePicker
            v-model="draftTmsFrom"
            aria-label="Choose TMS period start"
            placeholder="From"
            class="w-[180px]"
            :disabled="busy"
          />
        </div>
        <div class="grid gap-1.5">
          <span class="text-xs text-muted-foreground">To</span>
          <DatePicker
            v-model="draftTmsTo"
            aria-label="Choose TMS period end"
            placeholder="To"
            class="w-[180px]"
            :disabled="busy"
          />
        </div>
        <Button
          :disabled="busy || !periodReady"
          :loading="busyAction === 'period'"
          @click="requestApplyPeriod"
        >
          {{ busyAction === 'period' ? 'Applying…' : 'Apply Period' }}
        </Button>
        <Button
          variant="destructive"
          :disabled="busy || !periodSet"
          :loading="busyAction === 'clear-period'"
          @click="requestClearPeriod"
        >
          {{ busyAction === 'clear-period' ? 'Clearing…' : 'Clear' }}
        </Button>
      </div>
    </template>

    <div class="grid max-w-3xl gap-3 sm:grid-cols-3">
      <AdMetric
        label="Sessions"
        :value="sessionTotalLabel"
        hint="Included sessions used for the SYSTEM median. When Combine Subtask Time is Yes, each subtask's median is summed."
      />
      <AdMetric
        :label="withUnit('Median cycle time', FieldUnit.seconds)"
        :value="medianLabel"
        hint="Baseline used for simulation"
      />
      <AdMetric
        :label="withUnit('TMS ratio', FieldUnit.percent)"
        :value="tmsRatioMetric"
        :hint="tmsRatioHint"
      />
    </div>

    <div>
      <h3 class="mb-3 text-sm font-bold">TMS Sessions</h3>

      <DataTable
        :columns="columns"
        :data="rows"
        :pending="loading"
        empty-text="Set a TMS period to link COMPLETED sessions."
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
    </div>
  </div>

  <ConfirmDialog
    v-model:open="confirmPeriodOpen"
    title="Change TMS Period"
    description="Changing the period refreshes linked COMPLETED sessions and the SYSTEM median. Saved Forecast and Simulation results on all scenarios will be cleared."
    confirm-label="Apply Period"
    confirm-variant="default"
    :pending="busyAction === 'period'"
    @confirm="applyPeriod"
  />

  <ConfirmDialog
    v-model:open="confirmClearPeriodOpen"
    title="Clear TMS Period"
    description="Clearing the period unlinks TMS sessions and removes the SYSTEM median. Saved Forecast and Simulation results on all scenarios will be cleared."
    confirm-label="Clear"
    :pending="busyAction === 'clear-period'"
    @confirm="clearPeriod"
  />
</template>
