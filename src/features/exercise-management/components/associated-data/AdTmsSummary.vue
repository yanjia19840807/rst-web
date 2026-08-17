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

import type { CycleTimeBaseline, CycleTimeBaselineFile } from '../../types'
import type { MedianSourceMode } from './adTypes'
import { formatNumber } from './adTypes'
import CycleTimeControlChart from './CycleTimeControlChart.vue'

const props = defineProps<{
  source: MedianSourceMode
  cycleTime: CycleTimeBaseline | null
  exerciseId?: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:source': [value: MedianSourceMode]
}>()

const sourceLabel = computed(() =>
  props.source === 'manual' ? 'Manual median input' : 'System-calculated median',
)

const isManualBaseline = computed(
  () => props.cycleTime?.baselineType?.toUpperCase() === 'MANUAL',
)

const supportFiles = computed<CycleTimeBaselineFile[]>(() =>
  isManualBaseline.value ? (props.cycleTime?.files ?? []) : [],
)

const manualMedianLabel = computed(() => {
  if (!isManualBaseline.value || props.cycleTime == null) return '—'
  return `${props.cycleTime.medianSeconds != null ? Number(props.cycleTime.medianSeconds).toFixed(2) : '—'}s`
})

const manualReasonLabel = computed(() => {
  if (!isManualBaseline.value) return '—'
  return props.cycleTime?.manualReason?.trim() || '—'
})

const systemMetrics = computed(() => {
  const ct = props.cycleTime
  const isSystem = ct?.baselineType?.toUpperCase() === 'SYSTEM'
  return [
    {
      metric: 'Median cycle time',
      value: isSystem && ct ? `${Number(ct.medianSeconds).toFixed(2)}s` : '—',
      description: 'Used for simulation',
    },
    {
      metric: 'Accepted records',
      value: isSystem && ct?.sampleCount != null ? formatNumber(ct.sampleCount) : '—',
      description: 'Median sample count',
    },
  ]
})

function formatSize(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileHref(file: CycleTimeBaselineFile) {
  return file.webUrl || '#'
}
</script>

<template>
  <div>
    <!-- Read-only source summary (submitted / archived) -->
    <div v-if="readOnly" class="mb-4">
      <table class="w-full border-collapse text-sm">
        <tbody>
          <tr class="border-b">
            <td class="w-[32%] py-2 text-muted-foreground">Median source</td>
            <td class="py-2 font-semibold">{{ sourceLabel }}</td>
          </tr>
          <template v-if="source === 'manual'">
            <tr class="border-b">
              <td class="py-2 text-muted-foreground">Manual median cycle time</td>
              <td class="py-2">{{ manualMedianLabel }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 align-top text-muted-foreground">Reason for override</td>
              <td class="whitespace-pre-wrap py-2">{{ manualReasonLabel }}</td>
            </tr>
            <tr class="border-b">
              <td class="py-2 align-top text-muted-foreground">Support files</td>
              <td class="py-2">
                <ul v-if="supportFiles.length" class="space-y-1">
                  <li
                    v-for="file in supportFiles"
                    :key="file.id"
                    class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                  >
                    <a
                      class="font-medium text-primary underline-offset-2 hover:underline"
                      :href="fileHref(file)"
                      target="_blank"
                      rel="noopener noreferrer"
                      :download="file.fileName"
                    >
                      {{ file.fileName }}
                    </a>
                    <span class="text-xs text-muted-foreground">
                      {{ formatSize(file.sizeBytes) }}
                    </span>
                  </li>
                </ul>
                <span v-else class="text-muted-foreground">No files uploaded</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Editable source radios -->
    <div v-else class="mb-4 space-y-2.5">
      <label
        v-for="option in [
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
        ]"
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

    <!-- Shared TMS Metrics header -->
    <div class="space-y-4">
      <h3 class="text-base font-bold">TMS Metrics</h3>

      <!-- Manual read-only content -->
      <template v-if="source === 'manual'">
        <div class="overflow-x-auto rounded-lg border">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell class="w-[36%] text-muted-foreground">Manual median cycle time</TableCell>
                <TableCell class="font-medium">{{ manualMedianLabel }}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="align-top text-muted-foreground">Reason for override</TableCell>
                <TableCell class="whitespace-pre-wrap">{{ manualReasonLabel }}</TableCell>
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
                        :href="fileHref(file)"
                        target="_blank"
                        rel="noopener noreferrer"
                        :download="file.fileName"
                      >
                        {{ file.fileName }}
                      </a>
                      <span class="text-xs text-muted-foreground">
                        {{ formatSize(file.sizeBytes) }}
                      </span>
                    </li>
                  </ul>
                  <span v-else class="text-muted-foreground">No files uploaded</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p
          v-if="!readOnly && !isManualBaseline"
          class="text-xs text-muted-foreground"
        >
          No manual baseline saved yet. Click Edit to enter the median, reason, and support
          files.
        </p>
      </template>

      <!-- System metrics -->
      <template v-else>
        <div class="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in systemMetrics" :key="row.metric">
                <TableCell>{{ row.metric }}</TableCell>
                <TableCell>{{ row.value }}</TableCell>
                <TableCell class="text-muted-foreground">{{ row.description }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>

      <CycleTimeControlChart v-if="exerciseId" :exercise-id="exerciseId" />
    </div>
  </div>
</template>
