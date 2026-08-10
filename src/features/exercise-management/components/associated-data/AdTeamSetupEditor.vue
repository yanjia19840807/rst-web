<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import ReadOnlyField from '@/components/ReadOnlyField.vue'
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

import type { TeamSetup, TeamSetupRequest } from '../../types'
import AdMetric from './AdMetric.vue'
import { formatNumber } from './adTypes'

const props = defineProps<{
  modelValue: TeamSetup | null
  cycleTimeSeconds?: number | null
  supportFte?: number | null
  readOnly?: boolean
}>()

/** Editable fields shown in the prototype Team Setup UI. */
const form = reactive({
  agentsLt6m: null as number | null,
  agents6To24m: null as number | null,
  agents24To48m: null as number | null,
  agentsGt48m: null as number | null,
  workingHoursPerDay: null as number | null,
  paidLeaveDays: null as number | null,
  otherLeaveDays: null as number | null,
  weekendCode: '' as string,
  availabilityRatio: null as number | null,
  automationRatio: null as number | null,
  maxOvertimeMinutes: null as number | null,
  slaType: '' as string,
  slaTargetRatio: null as number | null,
  slaTurnaroundMinutes: null as number | null,
  slaStartTime: '',
  slaEndTime: '',
  weekendShiftHc: null as number | null,
  skeletonRatio: null as number | null,
})

/**
 * API-only fields kept for round-trip (present in data model / backend calc,
 * but not shown in the prototype Team Setup screen).
 */
const hidden = reactive({
  deliveryHc: null as number | null,
  capacityRatio: null as number | null,
  slaWeekendEnabled: null as boolean | null,
})

watch(
  () => props.modelValue,
  (t) => {
    if (!t) return
    Object.assign(form, {
      agentsLt6m: t.agentsLt6m ?? null,
      agents6To24m: t.agents6To24m ?? null,
      agents24To48m: t.agents24To48m ?? null,
      agentsGt48m: t.agentsGt48m ?? null,
      workingHoursPerDay: t.workingHoursPerDay ?? null,
      paidLeaveDays: t.paidLeaveDays ?? null,
      otherLeaveDays: t.otherLeaveDays ?? null,
      weekendCode: t.weekendCode ?? '',
      availabilityRatio: t.availabilityRatio ?? null,
      automationRatio: t.automationRatio ?? null,
      maxOvertimeMinutes: t.maxOvertimeMinutes ?? null,
      slaType: t.slaType ?? '',
      slaTargetRatio: t.slaTargetRatio ?? null,
      slaTurnaroundMinutes: t.slaTurnaroundMinutes ?? null,
      slaStartTime: t.slaStartTime ?? '',
      slaEndTime: t.slaEndTime ?? '',
      weekendShiftHc: t.weekendShiftHc ?? null,
      skeletonRatio: t.skeletonRatio ?? null,
    })
    Object.assign(hidden, {
      deliveryHc: t.deliveryHc ?? null,
      capacityRatio: t.capacityRatio ?? null,
      slaWeekendEnabled: t.slaWeekendEnabled ?? null,
    })
  },
  { immediate: true },
)

const draftTotalAgents = computed(() =>
  [form.agentsLt6m, form.agents6To24m, form.agents24To48m, form.agentsGt48m].reduce(
    (sum: number, value) => sum + (value ?? 0),
    0,
  ),
)

/** Prefer server Max Capacity (WorkingDays − leaves); fall back to working days. */
const maxCapacityDays = computed(() => {
  if (props.modelValue?.maxCapacityDays != null) return props.modelValue.maxCapacityDays
  return props.modelValue?.workingDaysPerYear ?? null
})

function toRequest(): TeamSetupRequest {
  return {
    agentsLt6m: form.agentsLt6m,
    agents6To24m: form.agents6To24m,
    agents24To48m: form.agents24To48m,
    agentsGt48m: form.agentsGt48m,
    deliveryHc: hidden.deliveryHc,
    workingHoursPerDay: form.workingHoursPerDay,
    paidLeaveDays: form.paidLeaveDays,
    otherLeaveDays: form.otherLeaveDays,
    weekendCode: form.weekendCode || null,
    availabilityRatio: form.availabilityRatio,
    automationRatio: form.automationRatio,
    // Backend daily-capacity formula requires capacityRatio; default 1 when unset.
    capacityRatio: hidden.capacityRatio ?? 1,
    maxOvertimeMinutes: form.maxOvertimeMinutes,
    slaType: form.slaType || null,
    slaTargetRatio: form.slaTargetRatio,
    slaTurnaroundMinutes: form.slaTurnaroundMinutes,
    slaStartTime: form.slaStartTime || null,
    slaEndTime: form.slaEndTime || null,
    slaWeekendEnabled: hidden.slaWeekendEnabled,
    weekendShiftHc: form.weekendShiftHc,
    skeletonRatio: form.skeletonRatio,
  }
}

defineExpose({ toRequest })
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AdMetric
        label="Cycle time"
        :value="cycleTimeSeconds != null ? `${cycleTimeSeconds}s` : '—'"
        hint="TMS-fed, override available"
      />
      <AdMetric
        label="Production support"
        :value="supportFte != null ? formatNumber(supportFte, 2) : '—'"
        hint="FTE from support registry"
      />
      <AdMetric
        label="Daily capacity / agent"
        :value="formatNumber(modelValue?.dailyCapacityPerAgent)"
        hint="Calculated from baseline inputs"
      />
      <AdMetric
        label="Working days"
        :value="formatNumber(modelValue?.workingDaysPerYear)"
        hint="Calendar and holiday adjusted"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-lg border bg-card p-4">
        <h3 class="mb-3 text-sm font-bold">Basic Info And Headcount</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm"
            >Agents &lt;6 months
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.agentsLt6m"
              :min="0"
              :step="1"
            />
            <ReadOnlyField v-else :value="form.agentsLt6m" />
          </label>
          <label class="grid gap-1 text-sm"
            >Agents 6–24 months
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.agents6To24m"
              :min="0"
              :step="1"
            />
            <ReadOnlyField v-else :value="form.agents6To24m" />
          </label>
          <label class="grid gap-1 text-sm"
            >Agents 24–48 months
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.agents24To48m"
              :min="0"
              :step="1"
            />
            <ReadOnlyField v-else :value="form.agents24To48m" />
          </label>
          <label class="grid gap-1 text-sm"
            >Agents &gt;48 months
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.agentsGt48m"
              :min="0"
              :step="1"
            />
            <ReadOnlyField v-else :value="form.agentsGt48m" />
          </label>
        </div>
        <div class="mt-3 overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Calculated</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Total agents</TableCell>
                <TableCell>{{ draftTotalAgents || '—' }}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Average tenure</TableCell>
                <TableCell>
                  {{
                    modelValue?.averageTenureYears != null
                      ? `${formatNumber(modelValue.averageTenureYears, 1)} years`
                      : '—'
                  }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <section class="rounded-lg border bg-card p-4">
        <h3 class="mb-3 text-sm font-bold">SLA And Working Hours</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm"
            >SLA turntime
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.slaTurnaroundMinutes"
              :min="0"
              :step="1"
            />
            <ReadOnlyField v-else :value="form.slaTurnaroundMinutes" />
          </label>
          <label class="grid gap-1 text-sm"
            >SLA target
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.slaTargetRatio"
              :min="0"
              :max="1"
              :step="0.01"
            />
            <ReadOnlyField v-else :value="form.slaTargetRatio" />
          </label>
          <label class="grid gap-1 text-sm"
            >SLA type
            <select
              v-if="!readOnly"
              v-model="form.slaType"
              class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              <option value="">Select…</option>
              <option value="BUSINESS_HOURS">Working Hours</option>
              <option value="CALENDAR_HOURS">Calendar Hours</option>
            </select>
            <ReadOnlyField v-else :value="form.slaType" />
          </label>
          <label class="grid gap-1 text-sm">
            Weekend code
            <ReadOnlyField :value="form.weekendCode || '—'" />
            <span class="text-xs text-muted-foreground">Maintained on Calendar</span>
          </label>
          <label class="grid gap-1 text-sm"
            >SLA clock start
            <TimePicker
              v-if="!readOnly"
              v-model="form.slaStartTime"
              aria-label="SLA clock start"
            />
            <ReadOnlyField v-else :value="form.slaStartTime" />
          </label>
          <label class="grid gap-1 text-sm"
            >SLA clock end
            <TimePicker
              v-if="!readOnly"
              v-model="form.slaEndTime"
              aria-label="SLA clock end"
            />
            <ReadOnlyField v-else :value="form.slaEndTime" />
          </label>
          <label class="grid gap-1 text-sm"
            >Working hours / day
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.workingHoursPerDay"
              :min="0"
              :step="0.1"
            />
            <ReadOnlyField v-else :value="form.workingHoursPerDay" />
          </label>
          <label class="grid gap-1 text-sm"
            >Availability ratio
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.availabilityRatio"
              :min="0"
              :max="1"
              :step="0.01"
            />
            <ReadOnlyField v-else :value="form.availabilityRatio" />
          </label>
          <label class="grid gap-1 text-sm"
            >Skeleton coverage
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.skeletonRatio"
              :min="0"
              :max="1"
              :step="0.01"
            />
            <ReadOnlyField v-else :value="form.skeletonRatio" />
          </label>
        </div>
      </section>

      <section class="rounded-lg border bg-card p-4 lg:col-span-2">
        <h3 class="mb-3 text-sm font-bold">Capacity Inputs</h3>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label class="grid gap-1 text-sm"
            >Paid leave / year
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.paidLeaveDays"
              :min="0"
              :step="1"
            />
            <ReadOnlyField v-else :value="form.paidLeaveDays" />
          </label>
          <label class="grid gap-1 text-sm"
            >Other leave / year
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.otherLeaveDays"
              :min="0"
              :step="1"
            />
            <ReadOnlyField v-else :value="form.otherLeaveDays" />
          </label>
          <label class="grid gap-1 text-sm"
            >Max daily overtime
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.maxOvertimeMinutes"
              :min="0"
              :step="1"
            />
            <ReadOnlyField v-else :value="form.maxOvertimeMinutes" />
          </label>
          <label class="grid gap-1 text-sm"
            >Weekend shift FTE
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.weekendShiftHc"
              :min="0"
              :step="0.1"
            />
            <ReadOnlyField v-else :value="form.weekendShiftHc" />
          </label>
          <label class="grid gap-1 text-sm"
            >Automation ratio
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.automationRatio"
              :min="0"
              :max="1"
              :step="0.01"
            />
            <ReadOnlyField v-else :value="form.automationRatio" />
          </label>
        </div>
        <div class="mt-3 overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Calculated</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Working days / year</TableCell>
                <TableCell>{{ formatNumber(modelValue?.workingDaysPerYear) }}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Max capacity days</TableCell>
                <TableCell>{{ formatNumber(maxCapacityDays) }}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Production support FTE</TableCell>
                <TableCell>
                  {{ supportFte != null ? formatNumber(supportFte, 2) : '—' }}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Daily capacity / agent</TableCell>
                <TableCell>
                  {{
                    modelValue?.dailyCapacityPerAgent != null
                      ? `${formatNumber(modelValue.dailyCapacityPerAgent)} transactions`
                      : '—'
                  }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          Derived metrics refresh after Save (server calculation).
        </p>
      </section>
    </div>
  </div>
</template>
