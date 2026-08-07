<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { TeamSetup, TeamSetupRequest } from '../../types'
import AdMetric from './AdMetric.vue'
import { formatNumber, formatPercentRatio, numOrNull } from './adTypes'

const props = defineProps<{
  modelValue: TeamSetup | null
  cycleTimeSeconds?: number | null
  supportFte?: number | null
  readOnly?: boolean
}>()

const form = reactive({
  agentsLt6m: '',
  agents6To24m: '',
  agents24To48m: '',
  agentsGt48m: '',
  deliveryHc: '',
  workingHoursPerDay: '8',
  paidLeaveDays: '',
  otherLeaveDays: '',
  weekendCode: 'SAT_SUN',
  availabilityRatio: '1',
  automationRatio: '',
  capacityRatio: '',
  maxOvertimeMinutes: '',
  slaType: 'BUSINESS_HOURS',
  slaTargetRatio: '0.9',
  slaTurnaroundMinutes: '480',
  slaStartTime: '09:00:00',
  slaEndTime: '18:00:00',
  slaWeekendEnabled: false,
  weekendShiftHc: '',
  skeletonRatio: '',
})

watch(
  () => props.modelValue,
  (t) => {
    if (!t) return
    Object.assign(form, {
      agentsLt6m: t.agentsLt6m ?? '',
      agents6To24m: t.agents6To24m ?? '',
      agents24To48m: t.agents24To48m ?? '',
      agentsGt48m: t.agentsGt48m ?? '',
      deliveryHc: t.deliveryHc ?? '',
      workingHoursPerDay: t.workingHoursPerDay ?? '8',
      paidLeaveDays: t.paidLeaveDays ?? '',
      otherLeaveDays: t.otherLeaveDays ?? '',
      weekendCode: t.weekendCode ?? 'SAT_SUN',
      availabilityRatio: t.availabilityRatio ?? '1',
      automationRatio: t.automationRatio ?? '',
      capacityRatio: t.capacityRatio ?? '',
      maxOvertimeMinutes: t.maxOvertimeMinutes ?? '',
      slaType: t.slaType ?? 'BUSINESS_HOURS',
      slaTargetRatio: t.slaTargetRatio ?? '0.9',
      slaTurnaroundMinutes: t.slaTurnaroundMinutes ?? '480',
      slaStartTime: t.slaStartTime ?? '09:00:00',
      slaEndTime: t.slaEndTime ?? '18:00:00',
      slaWeekendEnabled: Boolean(t.slaWeekendEnabled),
      weekendShiftHc: t.weekendShiftHc ?? '',
      skeletonRatio: t.skeletonRatio ?? '',
    })
  },
  { immediate: true },
)

const draftTotalAgents = computed(() => {
  const values = [
    form.agentsLt6m,
    form.agents6To24m,
    form.agents24To48m,
    form.agentsGt48m,
  ].map((v) => Number(v) || 0)
  return values.reduce((a, b) => a + b, 0)
})

function toRequest(): TeamSetupRequest {
  return {
    agentsLt6m: numOrNull(form.agentsLt6m),
    agents6To24m: numOrNull(form.agents6To24m),
    agents24To48m: numOrNull(form.agents24To48m),
    agentsGt48m: numOrNull(form.agentsGt48m),
    deliveryHc: numOrNull(form.deliveryHc),
    workingHoursPerDay: numOrNull(form.workingHoursPerDay),
    paidLeaveDays: numOrNull(form.paidLeaveDays),
    otherLeaveDays: numOrNull(form.otherLeaveDays),
    weekendCode: form.weekendCode || null,
    availabilityRatio: numOrNull(form.availabilityRatio),
    automationRatio: numOrNull(form.automationRatio),
    capacityRatio: numOrNull(form.capacityRatio),
    maxOvertimeMinutes: numOrNull(form.maxOvertimeMinutes),
    slaType: form.slaType || null,
    slaTargetRatio: numOrNull(form.slaTargetRatio),
    slaTurnaroundMinutes: numOrNull(form.slaTurnaroundMinutes),
    slaStartTime: form.slaStartTime || null,
    slaEndTime: form.slaEndTime || null,
    slaWeekendEnabled: form.slaWeekendEnabled,
    weekendShiftHc: numOrNull(form.weekendShiftHc),
    skeletonRatio: numOrNull(form.skeletonRatio),
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
      <section class="rounded-lg border p-4">
        <h3 class="mb-3 text-sm font-bold">Basic Info And Headcount</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm"
            >Agents &lt;6 months
            <Input v-model="form.agentsLt6m" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Agents 6–24 months
            <Input v-model="form.agents6To24m" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Agents 24–48 months
            <Input v-model="form.agents24To48m" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Agents &gt;48 months
            <Input v-model="form.agentsGt48m" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm sm:col-span-2"
            >Delivery HC
            <Input v-model="form.deliveryHc" :disabled="readOnly" />
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
                <TableCell>{{ draftTotalAgents }}</TableCell>
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

      <section class="rounded-lg border p-4">
        <h3 class="mb-3 text-sm font-bold">SLA And Working Hours</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm"
            >SLA turnaround (min)
            <Input v-model="form.slaTurnaroundMinutes" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >SLA target ratio
            <Input v-model="form.slaTargetRatio" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >SLA type
            <select
              v-model="form.slaType"
              class="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              :disabled="readOnly"
            >
              <option value="BUSINESS_HOURS">Working Hours</option>
              <option value="CALENDAR_HOURS">Calendar Hours</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm"
            >Weekend code
            <select
              v-model="form.weekendCode"
              class="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              :disabled="readOnly"
            >
              <option value="SAT_SUN">Sat-Sun off</option>
              <option value="SUN_ONLY">Sun off only</option>
              <option value="NONE">No weekend</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm"
            >SLA clock start
            <Input v-model="form.slaStartTime" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >SLA clock end
            <Input v-model="form.slaEndTime" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Working hours / day
            <Input v-model="form.workingHoursPerDay" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Availability ratio
            <Input v-model="form.availabilityRatio" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Skeleton coverage
            <Input v-model="form.skeletonRatio" :disabled="readOnly" />
          </label>
          <label class="inline-flex items-center gap-2 text-sm sm:col-span-2">
            <input v-model="form.slaWeekendEnabled" type="checkbox" :disabled="readOnly" />
            SLA weekend enabled
          </label>
        </div>
      </section>

      <section class="rounded-lg border p-4 lg:col-span-2">
        <h3 class="mb-3 text-sm font-bold">Capacity Inputs</h3>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label class="grid gap-1 text-sm"
            >Paid leave / year
            <Input v-model="form.paidLeaveDays" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Other leave / year
            <Input v-model="form.otherLeaveDays" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Max daily overtime (min)
            <Input v-model="form.maxOvertimeMinutes" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Weekend shift FTE
            <Input v-model="form.weekendShiftHc" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Automation ratio
            <Input v-model="form.automationRatio" :disabled="readOnly" />
          </label>
          <label class="grid gap-1 text-sm"
            >Capacity ratio
            <Input v-model="form.capacityRatio" :disabled="readOnly" />
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
                <TableCell>Daily capacity / agent</TableCell>
                <TableCell>{{ formatNumber(modelValue?.dailyCapacityPerAgent) }}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Production support FTE</TableCell>
                <TableCell>
                  {{ supportFte != null ? formatNumber(supportFte, 2) : '—' }}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Current SLA target</TableCell>
                <TableCell>{{ formatPercentRatio(numOrNull(form.slaTargetRatio)) }}</TableCell>
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
