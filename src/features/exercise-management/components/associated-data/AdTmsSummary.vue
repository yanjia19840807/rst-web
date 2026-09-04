<script setup lang="ts">
import { computed } from 'vue'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { FieldUnit, withUnit } from '../../fieldUnits'
import type { CycleTimeBaseline, CycleTimeBaselineFile } from '../../types'
import type { MedianSourceMode } from './adTypes'
import { formatNumber } from './adTypes'
import CycleTimeControlChart from './CycleTimeControlChart.vue'

const props = defineProps<{
  source: MedianSourceMode
  cycleTime: CycleTimeBaseline | null
  exerciseId: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:source': [value: MedianSourceMode]
}>()

const SOURCE_OPTIONS = [
  {
    value: 'system' as const,
    label: 'System-calculated median',
    hint: 'Use TMS sessions median and review metrics / control chart below.',
  },
  {
    value: 'manual' as const,
    label: 'Manual median input',
    hint: 'Enter a median override; optionally upload support files as approval evidence.',
  },
]

const sourceLabel = computed(() =>
  SOURCE_OPTIONS.find((option) => option.value === props.source)?.label ?? '—',
)

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

function formatSize(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="readOnly" class="text-sm">
      <span class="text-muted-foreground">Median source</span>
      <span class="ml-3 font-semibold">{{ sourceLabel }}</span>
    </div>
    <div v-else class="space-y-2.5">
      <label
        v-for="option in SOURCE_OPTIONS"
        :key="option.value"
        class="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-3"
        :class="
          source === option.value
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card'
        "
      >
        <input
          type="radio"
          class="mt-1"
          name="exercise-median-source"
          :checked="source === option.value"
          @change="emit('update:source', option.value)"
        />
        <span>
          <span class="block text-sm font-semibold">{{ option.label }}</span>
          <span class="mt-0.5 block text-xs text-muted-foreground">{{ option.hint }}</span>
        </span>
      </label>
    </div>

    <div class="space-y-4">
      <h3 class="text-sm font-bold">TMS Metrics</h3>

      <template v-if="source === 'manual'">
        <div class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell class="w-[36%] text-muted-foreground">
                  {{ withUnit('Manual median cycle time', FieldUnit.seconds) }}
                </TableCell>
                <TableCell class="font-medium">
                  {{ isManualBaseline ? medianSecondsLabel : '—' }}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="align-top text-muted-foreground">Reason for override</TableCell>
                <TableCell class="whitespace-pre-wrap">
                  {{ isManualBaseline ? (cycleTime?.manualReason?.trim() || '—') : '—' }}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="align-top text-muted-foreground">Support files</TableCell>
                <TableCell>
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
                  <span v-else class="text-muted-foreground">
                    {{ isManualBaseline ? 'No files uploaded' : 'No manual baseline saved yet.' }}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>

      <template v-else>
        <div class="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{{ withUnit('Median cycle time', FieldUnit.seconds) }}</TableCell>
                <TableCell>{{ isSystemBaseline ? medianSecondsLabel : '—' }}</TableCell>
                <TableCell class="text-muted-foreground">Used for simulation</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Accepted records</TableCell>
                <TableCell>{{ isSystemBaseline ? sampleCountLabel : '—' }}</TableCell>
                <TableCell class="text-muted-foreground">Median sample count</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p v-if="!isSystemBaseline" class="text-xs text-muted-foreground">
          No SYSTEM baseline yet. Empty processed volume is treated as 1 when cycle time is
          calculated. Open Edit to review the session list.
        </p>
      </template>

      <CycleTimeControlChart :exercise-id="exerciseId" />
    </div>
  </div>
</template>
