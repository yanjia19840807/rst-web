<script setup lang="ts">
import { computed } from 'vue'

import DetailTable from '@/components/DetailTable.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import StatusBadge from '@/components/StatusBadge.vue'
import type { TimesheetAlignmentView } from '@/features/timesheet-alignment/types'
import { formatHc } from '@/lib/hcFormat'

import type { Exercise } from '../types'

const props = withDefaults(
  defineProps<{
    snapshot: Exercise['snapshot'] | null
    alignment?: TimesheetAlignmentView | null
    embedded?: boolean
  }>(),
  { embedded: false },
)

const toolkit = computed(() => props.snapshot?.toolkit ?? null)

const countries = computed(() => {
  const items = props.snapshot?.sharedKpis ?? []
  return [...new Set(items.map((item) => item.customerCountry).filter(Boolean))]
})

const visibleSubtasks = computed(() =>
  (props.snapshot?.subtasks ?? []).filter((item) => !item.deletedAt),
)

const kpiRows = computed(() => props.snapshot?.sharedKpis ?? [])

const showCurrentMonthly = computed(() => Boolean(props.alignment))

function currentHcFor(line: Exercise['snapshot']['sharedKpis'][number]) {
  const match = props.alignment?.lines.find(
    (item) =>
      item.carrier === line.carrier &&
      item.site === line.site &&
      item.customerCountry === line.customerCountry,
  )
  if (!match || match.missing) return '—'
  return formatHc(match.currentDeliveryHc, 2)
}

function lineMissing(line: Exercise['snapshot']['sharedKpis'][number]) {
  return Boolean(
    props.alignment?.lines.some(
      (item) =>
        item.missing &&
        item.carrier === line.carrier &&
        item.site === line.site &&
        item.customerCountry === line.customerCountry,
    ),
  )
}

function statusLabel(enabled: boolean | undefined) {
  return enabled === false ? 'Disabled' : 'Enabled'
}

const totalDeliveryHc = computed(() =>
  kpiRows.value.reduce((sum, item) => sum + Number(item.deliveryHc || 0), 0),
)

const mappingRows = computed(() => {
  if (!toolkit.value) return []
  return [
    { label: 'Toolkit name', value: toolkit.value.name, strong: true },
    { label: 'Status', value: statusLabel(toolkit.value.enabled) },
    { label: 'GBS Center', value: toolkit.value.center },
    { label: 'Domain', value: toolkit.value.domain },
    { label: 'Process Level 1', value: toolkit.value.pl1 },
    { label: 'Process Level 2', value: toolkit.value.pl2 },
    { label: 'Process Level 3', value: toolkit.value.pl3Name },
    { label: 'Customer Country', value: countries.value.join(', ') || '—' },
  ]
})
</script>

<template>
  <p v-if="!toolkit" class="text-sm text-muted-foreground italic">No toolkit selected.</p>
  <div v-else class="grid gap-4">
    <section class="grid gap-4 rounded-lg border bg-card p-4">
      <div>
        <h3 class="text-sm font-semibold">Process Mapping</h3>
        <p class="mt-1 text-xs text-muted-foreground">
          Timesheet hierarchy, customer countries, and Shared KPI split.
        </p>
      </div>

      <DetailTable :rows="mappingRows" :columns="2" />

      <section class="grid gap-3 border-t pt-4">
        <div class="flex items-baseline justify-between gap-2">
          <h4 class="text-sm font-semibold">Shared KPI Scope Split</h4>
          <span class="text-xs text-muted-foreground">
            <template v-if="kpiRows.length">
              {{ kpiRows.length }} lines · Delivery HC
              {{ totalDeliveryHc.toFixed(2) }}
            </template>
            <template v-else>Not configured</template>
          </span>
        </div>

        <div
          v-if="!countries.length"
          class="rounded-lg border border-dashed px-3.5 py-3.5 text-sm text-muted-foreground"
        >
          Customer Country is not configured for this toolkit.
        </div>
        <div
          v-else-if="!kpiRows.length"
          class="rounded-lg border border-dashed px-3.5 py-3.5 text-sm text-muted-foreground"
        >
          No KPI lines selected for this toolkit.
        </div>
        <div v-else class="min-w-0 overflow-x-auto rounded-lg border">
          <Table class="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Carrier</TableHead>
                <TableHead>GBS Site</TableHead>
                <TableHead>Customer Country</TableHead>
                <TableHead>Delivery HC</TableHead>
                <TableHead v-if="showCurrentMonthly">Current Monthly</TableHead>
                <TableHead v-if="showCurrentMonthly">Line</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in kpiRows" :key="item.id">
                <TableCell>{{ item.carrier }}</TableCell>
                <TableCell>{{ item.site }}</TableCell>
                <TableCell>{{ item.customerCountry }}</TableCell>
                <TableCell>{{ Number(item.deliveryHc).toFixed(2) }}</TableCell>
                <TableCell v-if="showCurrentMonthly">{{ currentHcFor(item) }}</TableCell>
                <TableCell v-if="showCurrentMonthly">
                  <StatusBadge v-if="lineMissing(item)" status="Missing" />
                </TableCell>
              </TableRow>
              <TableRow class="bg-muted/40">
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell />
                <TableCell>{{ totalDeliveryHc.toFixed(2) }}</TableCell>
                <TableCell v-if="showCurrentMonthly">
                  {{ formatHc(alignment?.currentDeliveryHc, 2) }}
                </TableCell>
                <TableCell v-if="showCurrentMonthly" />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </section>

    <section class="grid gap-4 rounded-lg border bg-card p-4">
      <div>
        <h3 class="text-sm font-semibold">Subtasks</h3>
        <p class="mt-1 text-xs text-muted-foreground">
          Work steps timed in TMS, including Enable / Disable status.
        </p>
      </div>

      <div class="grid gap-1.5 text-sm">
        <div class="text-xs text-muted-foreground">Combine subtask time</div>
        <div>{{ toolkit.combineSubtasksTime ? 'Yes' : 'No' }}</div>
        <p class="text-xs text-muted-foreground">
          Yes: SYSTEM baseline is the sum of each subtask's median.
          No: SYSTEM baseline is the median of all included sessions.
        </p>
      </div>

      <div
        v-if="!visibleSubtasks.length"
        class="rounded-lg border border-dashed px-3.5 py-3.5 text-sm text-muted-foreground"
      >
        No subtasks defined.
      </div>
      <div v-else class="min-w-0 overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">#</TableHead>
              <TableHead>Subtask name</TableHead>
              <TableHead class="w-28">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(subtask, index) in visibleSubtasks" :key="subtask.id">
              <TableCell class="text-muted-foreground">{{ index + 1 }}</TableCell>
              <TableCell>{{ subtask.name || '—' }}</TableCell>
              <TableCell>
                <StatusBadge :status="statusLabel('enabled' in subtask ? subtask.enabled : true)" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  </div>
</template>
