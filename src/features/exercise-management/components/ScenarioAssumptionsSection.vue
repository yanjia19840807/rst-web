<script setup lang="ts">
import DetailTable from '@/components/DetailTable.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NumberFieldControl } from '@/components/ui/number-field'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TimePicker } from '@/components/ui/time-picker'

import type { DailySizingView, MonthlySizingView, SlotSimulationView, TeamSetup } from '../types'
import SizingSimulationCharts from './SizingSimulationCharts.vue'
import SlotSimulationCharts from './SlotSimulationCharts.vue'

export type ShiftDraft = {
  shiftNo: number
  startTime: string
  durationMinutes: number | null
  headcount: number | null
  worksOnWeekend: boolean
}

defineProps<{
  readOnly: boolean
  busy: boolean
  rightSizingHc: number
  shiftRows: ShiftDraft[]
  sizingCompleted: boolean
  slotCompleted: boolean
  slotLocked: boolean
  latestMonthlySizing: MonthlySizingView | null
  latestDailySizing: DailySizingView | null
  latestSlotSimulation: SlotSimulationView | null
  teamSetup: TeamSetup | null
  shiftSetupLabel: string
}>()

const emit = defineEmits<{
  'update:rightSizingHc': [value: number]
  runSizing: []
  runSlot: []
  addShift: []
  removeShift: []
  shiftEdited: []
}>()

function formatShiftTime(value?: string | null) {
  if (!value) return '—'
  return value.length >= 5 ? value.slice(0, 5) : value
}
</script>

<template>
  <div class="grid min-w-0 gap-3.5">
    <!-- Sizing Simulation Panel -->
    <section class="rounded-lg border bg-card p-4">
      <h3 class="mb-3 text-base font-bold">1. Sizing Simulation</h3>
      <div class="mb-3.5 rounded-lg border bg-card p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h4 class="text-sm font-bold">Sizing Inputs</h4>
          <Button v-if="!readOnly" size="sm" :disabled="busy" @click="emit('runSizing')">
            Run Simulation
          </Button>
        </div>
        <DetailTable
          v-if="readOnly"
          :rows="[
            {
              label: 'Right Sizing HC',
              value: Number.isFinite(rightSizingHc) ? rightSizingHc.toFixed(2) : '—',
            },
          ]"
        />
        <label v-else class="grid max-w-xs gap-1 text-sm">
          Right Sizing HC
          <NumberFieldControl
            :model-value="rightSizingHc"
            :min="0"
            @update:model-value="emit('update:rightSizingHc', Number($event ?? 0))"
          />
        </label>
      </div>

      <SizingSimulationCharts
        v-if="sizingCompleted"
        :monthly="latestMonthlySizing"
        :daily="latestDailySizing"
        :sla-target-ratio="teamSetup?.slaTargetRatio ?? null"
      />
      <div
        v-else
        class="rounded-md border border-dashed px-3 py-10 text-center text-sm text-muted-foreground"
      >
        {{
          readOnly
            ? 'No saved sizing simulation for this scenario.'
            : 'Run Sizing Simulation to generate forecast and simulation results.'
        }}
      </div>
    </section>

    <!-- Slot Simulation Panel -->
    <section
      class="rounded-lg border bg-card p-4"
      :class="!readOnly && slotLocked ? 'opacity-60' : undefined"
    >
      <h3 class="mb-1 text-base font-bold">2. Slot Simulation</h3>
      <p v-if="!readOnly && slotLocked" class="mb-3 text-xs text-muted-foreground">
        Run Sizing Simulation first to unlock Slot Simulation.
      </p>

      <div
        class="mb-3.5 rounded-lg border bg-card p-4"
        :class="!readOnly && slotLocked ? 'pointer-events-none' : undefined"
      >
        <div class="mb-3 flex items-center justify-between gap-2">
          <h4 class="text-sm font-bold">Shift Inputs</h4>
          <Button
            v-if="!readOnly"
            size="sm"
            :disabled="busy || slotLocked"
            @click="emit('runSlot')"
          >
            Run Simulation
          </Button>
        </div>

        <div v-if="!readOnly" class="mb-2.5 flex gap-2">
          <Button variant="outline" size="sm" :disabled="slotLocked" @click="emit('addShift')">
            Add
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="slotLocked || shiftRows.length <= 1"
            @click="emit('removeShift')"
          >
            Remove
          </Button>
        </div>

        <div class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead v-for="row in shiftRows" :key="row.shiftNo">
                  Shift {{ row.shiftNo }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell class="text-muted-foreground">Start</TableCell>
                <TableCell v-for="row in shiftRows" :key="`start-${row.shiftNo}`">
                  <span v-if="readOnly">{{ formatShiftTime(row.startTime) }}</span>
                  <TimePicker
                    v-else
                    v-model="row.startTime"
                    class="h-8"
                    :disabled="slotLocked"
                    :aria-label="`Shift ${row.shiftNo} start`"
                    @update:model-value="emit('shiftEdited')"
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="text-muted-foreground">Duration (min)</TableCell>
                <TableCell v-for="row in shiftRows" :key="`dur-${row.shiftNo}`">
                  <span v-if="readOnly">{{ row.durationMinutes ?? '—' }}</span>
                  <NumberFieldControl
                    v-else
                    v-model="row.durationMinutes"
                    :min="1"
                    :disabled="slotLocked"
                    @update:model-value="emit('shiftEdited')"
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="text-muted-foreground">Capacity FTE</TableCell>
                <TableCell v-for="row in shiftRows" :key="`hc-${row.shiftNo}`">
                  <span v-if="readOnly">{{ row.headcount ?? '—' }}</span>
                  <NumberFieldControl
                    v-else
                    v-model="row.headcount"
                    :min="0"
                    :disabled="slotLocked"
                    @update:model-value="emit('shiftEdited')"
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="text-muted-foreground">Weekend</TableCell>
                <TableCell v-for="row in shiftRows" :key="`wk-${row.shiftNo}`">
                  <span v-if="readOnly">{{ row.worksOnWeekend ? 'Yes' : 'No' }}</span>
                  <Label v-else class="flex items-center gap-2 text-sm">
                    <input
                      v-model="row.worksOnWeekend"
                      type="checkbox"
                      :disabled="slotLocked"
                      @change="emit('shiftEdited')"
                    />
                    Yes
                  </Label>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <section
        v-if="slotCompleted && latestSlotSimulation"
        class="rounded-lg border bg-card p-4"
      >
        <h4 class="mb-3 text-sm font-bold">Slot Simulation Result</h4>
        <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-md border px-3 py-2.5">
            <div class="text-xs text-muted-foreground">TAT on period</div>
            <div
              class="mt-1 font-semibold"
              :class="
                latestSlotSimulation.slaTargetRatio != null &&
                Number(latestSlotSimulation.tatOnPeriod) <
                  Number(latestSlotSimulation.slaTargetRatio)
                  ? 'text-destructive'
                  : undefined
              "
            >
              {{ (Number(latestSlotSimulation.tatOnPeriod) * 100).toFixed(2) }}%
            </div>
            <div class="mt-0.5 text-xs text-muted-foreground">
              Target
              {{
                latestSlotSimulation.slaTargetRatio == null
                  ? '—'
                  : `${Math.round(Number(latestSlotSimulation.slaTargetRatio) * 100)}%`
              }}
            </div>
          </div>
          <div class="rounded-md border px-3 py-2.5">
            <div class="text-xs text-muted-foreground">Actual vs theoretical</div>
            <div class="mt-1 font-semibold">
              {{ (Number(latestSlotSimulation.actualVsTheoretical) * 100).toFixed(0) }}%
            </div>
            <div class="mt-0.5 text-xs text-muted-foreground">
              sum(capacity) / sum(manual)
            </div>
          </div>
          <div class="rounded-md border px-3 py-2.5">
            <div class="text-xs text-muted-foreground">Shift setup</div>
            <div class="mt-1 font-semibold">{{ latestSlotSimulation.shiftCount }}</div>
            <div class="mt-0.5 text-xs text-muted-foreground">{{ shiftSetupLabel }}</div>
          </div>
          <div class="rounded-md border px-3 py-2.5">
            <div class="text-xs text-muted-foreground">Applicability</div>
            <div class="mt-1 font-semibold">
              {{ latestSlotSimulation.applicability ? 'On' : 'Off' }}
            </div>
            <div class="mt-0.5 text-xs text-muted-foreground">
              Calendar SLA &lt;= 24h or business-hours SLA &lt;= 8h
            </div>
          </div>
        </div>
        <SlotSimulationCharts :chart="latestSlotSimulation.chart" />
      </section>
    </section>
  </div>
</template>
