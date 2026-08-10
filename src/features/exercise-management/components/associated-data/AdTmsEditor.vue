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

import type { CycleTimeBaseline } from '../../types'
import AdMetric from './AdMetric.vue'
import { formatNumber, formatPercentRatio } from './adTypes'

const props = defineProps<{
  cycleTime: CycleTimeBaseline | null
  readOnly?: boolean
}>()

const medianLabel = computed(() =>
  props.cycleTime ? `${props.cycleTime.medianSeconds}s` : '—',
)
</script>

<template>
  <div class="space-y-4">
    <div class="grid max-w-xl gap-3 sm:grid-cols-2">
      <AdMetric
        label="Sessions"
        :value="cycleTime?.sampleCount != null ? formatNumber(cycleTime.sampleCount) : '—'"
        hint="Timing entries used by active baseline"
      />
      <AdMetric
        label="Median cycle time"
        :value="medianLabel"
        hint="Baseline used for simulation"
      />
    </div>

    <section class="rounded-lg border bg-card p-4">
      <div class="mb-3 flex items-baseline gap-2">
        <h3 class="text-base font-bold">TMS Sessions</h3>
        <span class="text-xs text-muted-foreground">
          {{ cycleTime?.sampleCount != null ? `${cycleTime.sampleCount} records` : 'No session feed' }}
        </span>
      </div>

      <p class="mb-3 text-sm text-muted-foreground">
        Session-level filter and raw TMS browse match the prototype layout. Detailed session rows
        become available when the TMS sample feed is connected for this exercise window
        {{ cycleTime ? `(active ${cycleTime.baselineType} baseline)` : '' }}.
      </p>

      <div class="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Subtask</TableHead>
              <TableHead>Cycle time</TableHead>
              <TableHead v-if="!readOnly">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell
                :colspan="readOnly ? 5 : 6"
                class="h-24 text-center text-sm text-muted-foreground italic"
              >
                <template v-if="cycleTime">
                  Active median {{ medianLabel }} · coverage
                  {{
                    cycleTime.coverageRatio != null
                      ? formatPercentRatio(cycleTime.coverageRatio)
                      : '—'
                  }}
                  · sample method {{ cycleTime.calculationMethod || '—' }}
                </template>
                <template v-else>No active Cycle Time baseline yet.</template>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  </div>
</template>
