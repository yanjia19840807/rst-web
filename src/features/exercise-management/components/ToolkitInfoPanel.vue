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
import { distinctCommaTokens } from '@/lib/commaTokens'
import { formatHc } from '@/lib/hcFormat'

import type { Exercise } from '../types'

const props = withDefaults(
  defineProps<{
    snapshot: Exercise['snapshot'] | null
    alignment?: TimesheetAlignmentView | null
    embedded?: boolean
    showDeliveryHc?: boolean
  }>(),
  { embedded: false, showDeliveryHc: false },
)

const toolkit = computed(() => props.snapshot?.toolkit ?? null)

const countries = computed(() => {
  const items = props.snapshot?.sharedKpis ?? []
  return distinctCommaTokens(items.map((item) => item.customerCountry))
})

const visibleSubtasks = computed(() =>
  (props.snapshot?.subtasks ?? []).filter((item) => !item.isDeleted),
)

const kpiRows = computed(() => props.snapshot?.sharedKpis ?? [])

const totalDeliveryHc = computed(() =>
  kpiRows.value.reduce((sum, item) => sum + Number(item.deliveryHc || 0), 0),
)

function statusLabel(enabled: boolean | undefined) {
  return enabled === false ? 'Disabled' : 'Enabled'
}

const mappingRows = computed(() => {
  if (!toolkit.value) return []
  const rows: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: 'Toolkit', value: toolkit.value.name, strong: true },
  ]
  if (!props.showDeliveryHc) {
    rows.push({ label: 'Status', value: statusLabel(toolkit.value.enabled) })
  }
  rows.push(
    { label: 'GBS Center', value: toolkit.value.center },
    { label: 'Domain', value: toolkit.value.domain },
    { label: 'PL1', value: toolkit.value.pl1 },
    { label: 'PL2', value: toolkit.value.pl2 },
    { label: 'PL3', value: toolkit.value.pl3Name },
    { label: 'Customer Country', value: countries.value.join(', ') || '—' },
  )
  return rows
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
            <template v-if="!kpiRows.length">Not configured</template>
            <template v-else-if="showDeliveryHc">
              {{ kpiRows.length }} lines · Delivery HC {{ formatHc(totalDeliveryHc, 2) }}
            </template>
            <template v-else>{{ kpiRows.length }} lines</template>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carrier</TableHead>
                <TableHead>GBS Site</TableHead>
                <TableHead>Customer Country</TableHead>
                <TableHead v-if="showDeliveryHc">Delivery HC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in kpiRows" :key="item.id">
                <TableCell>{{ item.carrier }}</TableCell>
                <TableCell>{{ item.site }}</TableCell>
                <TableCell>{{ item.customerCountry }}</TableCell>
                <TableCell v-if="showDeliveryHc">{{ formatHc(item.deliveryHc, 2) }}</TableCell>
              </TableRow>
              <TableRow v-if="showDeliveryHc" class="bg-muted/40">
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell />
                <TableCell>{{ formatHc(totalDeliveryHc, 2) }}</TableCell>
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
        <div class="text-xs text-muted-foreground">Combine Subtask Time</div>
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
