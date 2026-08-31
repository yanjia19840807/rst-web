<script setup lang="ts">
import { computed } from 'vue'

import DetailTable from '@/components/DetailTable.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { Exercise } from '../types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  snapshot: Exercise['snapshot'] | null
}>()

const toolkit = computed(() => props.snapshot?.toolkit ?? null)

const countries = computed(() => {
  const items = props.snapshot?.sharedKpis ?? []
  return [...new Set(items.map((item) => item.customerCountry).filter(Boolean))]
})

const activeSubtasks = computed(() =>
  (props.snapshot?.subtasks ?? []).filter((item) => !item.deletedAt),
)

const kpiRows = computed(() => props.snapshot?.sharedKpis ?? [])

const totalDeliveryHc = computed(() =>
  kpiRows.value.reduce((sum, item) => sum + Number(item.deliveryHc || 0), 0),
)

const detailRows = computed(() => {
  if (!toolkit.value) return []
  return [
    { label: 'Toolkit', value: toolkit.value.name },
    { label: 'GBS Center', value: toolkit.value.center },
    { label: 'Domain', value: toolkit.value.domain },
    { label: 'Process Level 1', value: toolkit.value.pl1 },
    { label: 'Process Level 2', value: toolkit.value.pl2 },
    { label: 'Process Level 3', value: toolkit.value.pl3Name },
    { label: 'Customer Country', value: countries.value.join(', ') || '—' },
    {
      label: 'Combine subtask time',
      value: toolkit.value.combineSubtasksTime ? 'Yes' : 'No',
    },
  ]
})

const subtaskRows = computed(() =>
  activeSubtasks.value.map((subtask, index) => ({
    key: subtask.id,
    label: String(index + 1),
    value: subtask.name,
  })),
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex h-[92vh] w-[min(1080px,96vw)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]"
    >
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>Toolkit Info</DialogTitle>
        <DialogDescription>
          Read-only toolkit configuration, including process mapping, subtasks, and Shared KPI
          scope.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
        <p v-if="!toolkit" class="text-sm text-muted-foreground italic">No toolkit selected.</p>
        <div v-else class="rounded-lg border bg-card p-4">
          <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div
                class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Toolkit details
              </div>
              <DetailTable :rows="detailRows" />
            </div>

            <div>
              <div class="mb-2 flex items-baseline justify-between gap-2">
                <div
                  class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  Subtasks
                </div>
                <span class="text-xs text-muted-foreground">
                  {{ activeSubtasks.length }} defined
                </span>
              </div>
              <div
                v-if="!activeSubtasks.length"
                class="rounded-lg border border-dashed px-3.5 py-3.5 text-sm text-muted-foreground"
              >
                No subtasks defined.
              </div>
              <DetailTable
                v-else
                :rows="subtaskRows"
                class="grid-cols-[minmax(40px,0.2fr)_1fr]"
              />
            </div>
          </div>

          <div class="mt-4">
            <div class="mb-2 flex items-baseline justify-between gap-2">
              <div class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Shared KPI Scope Split
              </div>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="item in kpiRows" :key="item.id">
                    <TableCell>{{ item.carrier }}</TableCell>
                    <TableCell>{{ item.site }}</TableCell>
                    <TableCell>{{ item.customerCountry }}</TableCell>
                    <TableCell>{{ Number(item.deliveryHc).toFixed(2) }}</TableCell>
                  </TableRow>
                  <TableRow class="bg-muted/40">
                    <TableCell>Total</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell>{{ totalDeliveryHc.toFixed(2) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button type="button" variant="outline" @click="open = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
