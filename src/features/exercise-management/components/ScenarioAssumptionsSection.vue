<script setup lang="ts">
import { computed } from 'vue'

import DetailTable from '@/components/DetailTable.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NumberFieldControl } from '@/components/ui/number-field'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TimePicker } from '@/components/ui/time-picker'

import type { ShiftDraft } from '../schemas/scenario'
import type { DailySizingView, MonthlySizingView, SlotSimulationView, TeamSetup } from '../types'
import SizingSimulationCharts from './SizingSimulationCharts.vue'
import SlotSimulationCharts from './SlotSimulationCharts.vue'

export type { ShiftDraft }

const props = defineProps<{
  exerciseId: string
  sizingMonth?: string
  readOnly: boolean
  busy: boolean
  runningSizing: boolean
  runningSlot: boolean
  rightSizingHc: number
  shiftRows: ShiftDraft[]
  sizingCompleted: boolean
  slotCompleted: boolean
  slotLocked: boolean
  slotLockReason?: string | null
  latestMonthlySizing: MonthlySizingView | null
  latestDailySizing: DailySizingView | null
  latestSlotSimulation: SlotSimulationView | null
  teamSetup: TeamSetup | null
  shiftSetupLabel: string
  rightSizingHcError?: string
  shiftsError?: string
  shiftFieldErrors?: Array<{
    startTime?: string
    durationHours?: string
    headcount?: string
  }>
}>()

const emit = defineEmits<{
  'update:rightSizingHc': [value: number]
  runSizing: []
  runSlot: []
  addShift: []
  removeShift: []
  shiftEdited: []
}>()

const showShiftInputs = computed(() => props.readOnly || !props.slotLocked)

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
          <Button
            v-if="!readOnly"
            size="sm"
            :disabled="busy"
            :loading="runningSizing"
            @click="emit('runSizing')"
          >
            {{ runningSizing ? 'Running…' : 'Run Simulation' }}
          </Button>
        </div>
        <DetailTable
          v-if="readOnly"
          :rows="[
            {
              label: 'Right Sizing HC',
              value: rightSizingHc > 0 ? rightSizingHc.toFixed(2) : '—',
            },
          ]"
        />
        <label v-else class="grid max-w-xs gap-1 text-sm">
          Right Sizing HC
          <NumberFieldControl
            :model-value="rightSizingHc"
            :min="0"
            :disabled="busy"
            :invalid="Boolean(rightSizingHcError)"
            @update:model-value="emit('update:rightSizingHc', Number($event ?? 0))"
          />
          <p v-if="rightSizingHcError" class="text-xs text-destructive">{{ rightSizingHcError }}</p>
        </label>
      </div>

      <SizingSimulationCharts
        v-if="sizingCompleted"
        :exercise-id="exerciseId"
        :sizing-month="sizingMonth"
        :monthly="latestMonthlySizing"
        :daily="latestDailySizing"
        :team-setup="teamSetup"
      />
      <div
        v-else-if="runningSizing"
        class="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-3 py-10 text-sm text-muted-foreground"
      >
        <Spinner class="size-6 text-primary" />
        <span>Running sizing…</span>
      </div>
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
    <section class="rounded-lg border bg-card p-4">
      <h3 class="mb-3 text-base font-bold">2. Slot Simulation</h3>

      <div v-if="showShiftInputs" class="mb-3.5 rounded-lg border bg-card p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h4 class="text-sm font-bold">Shift Inputs</h4>
          <Button
            v-if="!readOnly"
            size="sm"
            :disabled="busy"
            :loading="runningSlot"
            @click="emit('runSlot')"
          >
            {{ runningSlot ? 'Running…' : 'Run Simulation' }}
          </Button>
        </div>

        <p v-if="shiftsError" class="mb-2 text-xs text-destructive">{{ shiftsError }}</p>
        <div v-if="!readOnly" class="mb-2.5 flex gap-2">
          <Button variant="outline" size="sm" :disabled="busy" @click="emit('addShift')">
            Add
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="busy || shiftRows.length <= 1"
            @click="emit('removeShift')"
          >
            Remove
          </Button>
        </div>

        <div class="min-w-0 overflow-x-auto rounded-md border">
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
                <TableCell v-for="(row, index) in shiftRows" :key="`start-${row.shiftNo}`">
                  <span v-if="readOnly">{{ formatShiftTime(row.startTime) }}</span>
                  <div v-else class="grid gap-1">
                    <TimePicker
                      v-model="row.startTime"
                      size="sm"
                      class="w-[140px]"
                      :disabled="busy"
                      :invalid="Boolean(shiftFieldErrors?.[index]?.startTime)"
                      :aria-label="`Shift ${row.shiftNo} start`"
                      @update:model-value="emit('shiftEdited')"
                    />
                    <p
                      v-if="shiftFieldErrors?.[index]?.startTime"
                      class="text-xs text-destructive"
                    >
                      {{ shiftFieldErrors[index]?.startTime }}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="text-muted-foreground">Duration (hours)</TableCell>
                <TableCell v-for="(row, index) in shiftRows" :key="`dur-${row.shiftNo}`">
                  <span v-if="readOnly">{{ row.durationHours ?? '—' }}</span>
                  <div v-else class="grid gap-1">
                    <NumberFieldControl
                      v-model="row.durationHours"
                      :min="0.25"
                      :step="0.25"
                      :decimals="2"
                      :disabled="busy"
                      :invalid="Boolean(shiftFieldErrors?.[index]?.durationHours)"
                      @update:model-value="emit('shiftEdited')"
                    />
                    <p
                      v-if="shiftFieldErrors?.[index]?.durationHours"
                      class="text-xs text-destructive"
                    >
                      {{ shiftFieldErrors[index]?.durationHours }}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="text-muted-foreground">Capacity FTE</TableCell>
                <TableCell v-for="(row, index) in shiftRows" :key="`hc-${row.shiftNo}`">
                  <span v-if="readOnly">{{ row.headcount ?? '—' }}</span>
                  <div v-else class="grid gap-1">
                    <NumberFieldControl
                      v-model="row.headcount"
                      :min="0"
                      :disabled="busy"
                      :invalid="Boolean(shiftFieldErrors?.[index]?.headcount)"
                      @update:model-value="emit('shiftEdited')"
                    />
                    <p
                      v-if="shiftFieldErrors?.[index]?.headcount"
                      class="text-xs text-destructive"
                    >
                      {{ shiftFieldErrors[index]?.headcount }}
                    </p>
                  </div>
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
                      :disabled="busy"
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
      <div
        v-else
        class="mb-3.5 rounded-md border border-dashed px-3 py-10 text-center text-sm text-muted-foreground"
      >
        {{ slotLockReason || 'Slot Simulation is locked.' }}
      </div>

      <section
        v-if="showShiftInputs && slotCompleted && latestSlotSimulation"
        class="rounded-lg border bg-card p-4"
      >
        <h4 class="mb-3 text-sm font-bold">Slot Simulation Result</h4>
        <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-md border px-3 py-2.5">
            <div class="text-xs text-muted-foreground">TAT on period (%)</div>
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
              {{ (Number(latestSlotSimulation.tatOnPeriod) * 100).toFixed(2) }}
            </div>
            <div class="mt-0.5 text-xs text-muted-foreground">
              Target
              {{
                latestSlotSimulation.slaTargetRatio == null
                  ? '—'
                  : Math.round(Number(latestSlotSimulation.slaTargetRatio) * 100)
              }}
            </div>
          </div>
          <div class="rounded-md border px-3 py-2.5">
            <div class="text-xs text-muted-foreground">Actual vs theoretical (%)</div>
            <div class="mt-1 font-semibold">
              {{ (Number(latestSlotSimulation.actualVsTheoretical) * 100).toFixed(0) }}
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
        </div>
        <SlotSimulationCharts :simulation="latestSlotSimulation" />
      </section>
      <div
        v-else-if="showShiftInputs && runningSlot"
        class="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-3 py-10 text-sm text-muted-foreground"
      >
        <Spinner class="size-6 text-primary" />
        <span>Running slot simulation…</span>
      </div>
    </section>
  </div>
</template>
