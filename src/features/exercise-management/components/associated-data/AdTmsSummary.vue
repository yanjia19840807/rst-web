<script setup lang="ts">
import { computed, ref } from 'vue'

import TableTextLink from '@/components/TableTextLink.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { FieldUnit, withUnit } from '../../fieldUnits'
import { formatTmsPeriodLabel } from '../../periodWindows'
import { tmsRatioLabel } from '../../tmsRatio'
import type { CycleTimeBaseline, CycleTimeBaselineFile } from '../../types'
import type { MedianSourceMode } from './adTypes'
import { formatNumber } from './adTypes'
import AdSummaryTable from './AdSummaryTable.vue'
import CycleTimeControlChart from './CycleTimeControlChart.vue'

const props = defineProps<{
  source: MedianSourceMode
  cycleTime: CycleTimeBaseline | null
  tmsFrom: string | null
  tmsTo: string | null
  exerciseId: string
  readOnly?: boolean
}>()

const chartOpen = ref(false)

const chartRow = {
  key: 'chart',
  label: 'Control chart',
  value: '',
} as const

const isManualBaseline = computed(
  () => props.cycleTime?.baselineType?.toUpperCase() === 'MANUAL',
)

const isSystemBaseline = computed(
  () => props.cycleTime?.baselineType?.toUpperCase() === 'SYSTEM',
)

const supportFiles = computed<CycleTimeBaselineFile[]>(() =>
  isManualBaseline.value ? (props.cycleTime?.files ?? []) : [],
)

const medianSecondsLabel = computed(() => {
  if (props.cycleTime?.medianSeconds == null) return '—'
  return Number(props.cycleTime.medianSeconds).toFixed(2)
})

const sampleCountLabel = computed(() =>
  props.cycleTime?.sampleCount != null ? formatNumber(props.cycleTime.sampleCount) : '—',
)

const tmsRatio = computed(() => (isSystemBaseline.value ? props.cycleTime?.tmsRatio ?? null : null))

const manualRows = computed(() => [
  {
    label: withUnit('Manual median cycle time', FieldUnit.seconds),
    value: isManualBaseline.value ? medianSecondsLabel.value : '—',
  },
  {
    key: 'reason',
    label: 'Reason for override',
    value: isManualBaseline.value ? props.cycleTime?.manualReason?.trim() || '—' : '—',
  },
  { key: 'files', label: 'Support files', value: '' },
])

const systemRows = computed(() => [
  { label: 'TMS period', value: formatTmsPeriodLabel(props.tmsFrom, props.tmsTo) },
  {
    label: withUnit('Median cycle time', FieldUnit.seconds),
    value: isSystemBaseline.value ? medianSecondsLabel.value : '—',
  },
  {
    label: 'Accepted records',
    value: isSystemBaseline.value ? sampleCountLabel.value : '—',
  },
  {
    label: withUnit('TMS ratio', FieldUnit.percent),
    value: isSystemBaseline.value ? tmsRatioLabel(tmsRatio.value) : '—',
  },
  chartRow,
])

function formatSize(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="space-y-4">
    <template v-if="source === 'manual'">
      <AdSummaryTable :rows="manualRows">
        <template #reason>
          <span class="whitespace-pre-wrap">
            {{ isManualBaseline ? cycleTime?.manualReason?.trim() || '—' : '—' }}
          </span>
        </template>
        <template #files>
          <ul v-if="supportFiles.length" class="space-y-1">
            <li
              v-for="file in supportFiles"
              :key="file.id"
              class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
            >
              <a
                class="font-medium text-primary underline-offset-2 hover:underline"
                :href="file.webUrl || '#'"
                target="_blank"
                rel="noopener noreferrer"
                :download="file.fileName"
              >
                {{ file.fileName }}
              </a>
              <span class="text-xs text-muted-foreground">{{ formatSize(file.sizeBytes) }}</span>
            </li>
          </ul>
          <span v-else>
            {{ isManualBaseline ? 'No files uploaded' : 'No manual baseline saved yet.' }}
          </span>
        </template>
      </AdSummaryTable>
    </template>

    <template v-else>
      <AdSummaryTable :rows="systemRows">
        <template #chart>
          <TableTextLink title="Cycle Time Control Chart" @click="chartOpen = true">
            View
          </TableTextLink>
        </template>
      </AdSummaryTable>
      <p v-if="!isSystemBaseline" class="text-xs text-muted-foreground">
        No SYSTEM baseline yet. Open Edit TMS and apply a TMS period.
      </p>
    </template>

    <Dialog v-model:open="chartOpen">
      <DialogContent
        class="flex h-[92vh] w-[min(1080px,96vw)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]"
      >
        <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
          <DialogTitle>Cycle Time Control Chart</DialogTitle>
          <DialogDescription>
            Daily and rolling median from included TMS sessions.
          </DialogDescription>
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
          <CycleTimeControlChart v-if="chartOpen" hide-title :exercise-id="exerciseId" />
        </div>
        <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
          <Button type="button" variant="outline" @click="chartOpen = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
