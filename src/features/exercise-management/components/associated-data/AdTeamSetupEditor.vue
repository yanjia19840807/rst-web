<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import ReadOnlyField from '@/components/ReadOnlyField.vue'
import DetailTable from '@/components/DetailTable.vue'
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

import { teamSetupRequestSchema } from '../../schemas/teamSetup'
import type { TeamSetup, TeamSetupRequest } from '../../types'
import { computeNetworkDays } from '../../workingDays'
import {
  DEFAULT_WEEKEND_CODE,
  WEEKEND_CODE_OPTIONS,
  normalizeWeekendCode,
  weekendCodeLabel,
} from '../../weekendCodes'
import AdMetric from './AdMetric.vue'
import { formatNumber } from './adTypes'

const props = defineProps<{
  modelValue: TeamSetup | null
  cycleTimeSeconds?: number | null
  supportFte?: number | null
  sizingMonth?: string | null
  readOnly?: boolean
}>()

/** Editable fields shown in the prototype Team Setup UI. */
const form = reactive({
  agentsLt6m: null as number | null,
  agents6To24m: null as number | null,
  agents24To48m: null as number | null,
  agentsGt48m: null as number | null,
  paidLeaveDays: null as number | null,
  otherLeaveDays: null as number | null,
  weekendCode: DEFAULT_WEEKEND_CODE as string,
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

/** Persisted input not shown in the prototype Team Setup screen. */
const hidden = reactive({
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
      paidLeaveDays: t.paidLeaveDays ?? null,
      otherLeaveDays: t.otherLeaveDays ?? null,
      weekendCode: normalizeWeekendCode(t.weekendCode),
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

/** Live preview; Excel Input C10: (3·&lt;6m + 15·6–24m + 36·24–48m + 48·&gt;48m) / 12 / total. */
const draftAverageTenureYears = computed(() => {
  const total = draftTotalAgents.value
  if (total <= 0) return null
  const weightedMonths =
    (form.agentsLt6m ?? 0) * 3 +
    (form.agents6To24m ?? 0) * 15 +
    (form.agents24To48m ?? 0) * 36 +
    (form.agentsGt48m ?? 0) * 48
  return weightedMonths / 12 / total
})

/** Backend stores 0–1 ratios; UI edits 0–100 percent. */
function ratioToPercent(ratio: number | null): number | null {
  if (ratio == null) return null
  return Math.round(ratio * 10000) / 100
}

function percentToRatio(percent: number | null): number | null {
  if (percent == null) return null
  return Math.round(percent * 100) / 10000
}

function formatPercent(ratio: number | null): string {
  const percent = ratioToPercent(ratio)
  return percent == null ? '—' : `${formatNumber(percent, 2)}%`
}

function percentModel(
  key: 'slaTargetRatio' | 'availabilityRatio' | 'skeletonRatio' | 'automationRatio',
) {
  return computed({
    get: () => ratioToPercent(form[key]),
    set: (value: number | null) => {
      form[key] = percentToRatio(value)
    },
  })
}

const slaTargetPercent = percentModel('slaTargetRatio')
const availabilityPercent = percentModel('availabilityRatio')
const skeletonPercent = percentModel('skeletonRatio')
const automationPercent = percentModel('automationRatio')

/** Minutes (with fractional seconds) from HH:mm[:ss]; null when invalid/empty. */
function parseClockToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] ?? 0)
  if (hours > 23 || minutes > 59 || seconds > 59) return null
  return hours * 60 + minutes + seconds / 60
}

/** Live: SLA end − start (overnight wraps +24h). Matches backend. */
const draftWorkingHoursPerDay = computed(() => {
  const start = parseClockToMinutes(form.slaStartTime)
  const end = parseClockToMinutes(form.slaEndTime)
  if (start == null || end == null) return null
  let minutes = end - start
  if (minutes <= 0) minutes += 24 * 60
  return Math.round((minutes / 60) * 1_000_000) / 1_000_000
})

/**
 * Live Excel C36: WorkingHrPerDay × AvailabilityRatio × 3600 / CycleTime.
 * Working hours is the SLA clock statistic, not a separate input.
 */
const draftDailyCapacityPerAgent = computed(() => {
  const hours = draftWorkingHoursPerDay.value
  const availability = form.availabilityRatio
  const cycleTime = props.cycleTimeSeconds != null ? Number(props.cycleTimeSeconds) : NaN
  if (hours == null || availability == null || !Number.isFinite(cycleTime) || cycleTime <= 0) {
    return null
  }
  return Math.round(((hours * availability * 3600) / cycleTime) * 1e6) / 1e6
})

const dailyCapacityDisplay = computed(() => {
  if (draftDailyCapacityPerAgent.value != null) {
    return `${formatNumber(draftDailyCapacityPerAgent.value, 0)} transactions`
  }
  const cycleTime = props.cycleTimeSeconds != null ? Number(props.cycleTimeSeconds) : NaN
  if (!Number.isFinite(cycleTime) || cycleTime <= 0) {
    return '— (needs Cycle time from TMS)'
  }
  return '—'
})

/** NETWORKDAYS from Team Setup weekend code for the sizing year (no holidays). */
const workingDaysPerYear = computed(() => {
  const year = Number(String(props.sizingMonth ?? '').slice(0, 4))
  if (!Number.isFinite(year) || year < 1900) {
    return props.modelValue?.workingDaysPerYear ?? null
  }
  return computeNetworkDays(year, form.weekendCode || DEFAULT_WEEKEND_CODE, [])
})

/** Live: WorkingDays − paidLeave − otherLeave. Matches backend. */
const draftMaxCapacityDays = computed(() => {
  const workingDays = workingDaysPerYear.value
  if (workingDays == null) return null
  return workingDays - (form.paidLeaveDays ?? 0) - (form.otherLeaveDays ?? 0)
})

/** Live: maxCapacity / workingDays. Matches backend. */
const draftCapacityRatio = computed(() => {
  const workingDays = workingDaysPerYear.value
  const maxCapacity = draftMaxCapacityDays.value
  if (workingDays == null || maxCapacity == null || workingDays <= 0) return null
  return Math.round((maxCapacity / workingDays) * 1e8) / 1e8
})

function slaTypeLabel(value: string | null | undefined) {
  if (value === 'BUSINESS_HOURS') return 'Working Hours'
  if (value === 'CALENDAR_HOURS') return 'Calendar Hours'
  return value || '—'
}

const headcountRows = computed(() => [
  { label: 'Agents <6 months', value: form.agentsLt6m },
  { label: 'Agents 6–24 months', value: form.agents6To24m },
  { label: 'Agents 24–48 months', value: form.agents24To48m },
  { label: 'Agents >48 months', value: form.agentsGt48m },
  { label: 'Total agents', value: draftTotalAgents.value || '—' },
  {
    label: 'Average tenure',
    value:
      draftAverageTenureYears.value != null
        ? `${formatNumber(draftAverageTenureYears.value, 1)} years`
        : '—',
  },
])

const slaRows = computed(() => [
  { label: 'SLA turntime', value: formatNumber(form.slaTurnaroundMinutes, 2) },
  { label: 'SLA target (%)', value: formatPercent(form.slaTargetRatio) },
  { label: 'SLA type', value: slaTypeLabel(form.slaType) },
  { label: 'Weekend code', value: weekendCodeLabel(form.weekendCode) },
  { label: 'SLA clock start', value: form.slaStartTime || '—' },
  { label: 'SLA clock end', value: form.slaEndTime || '—' },
  { label: 'Availability ratio (%)', value: formatPercent(form.availabilityRatio) },
  { label: 'Skeleton coverage (%)', value: formatPercent(form.skeletonRatio) },
  {
    label: 'Working hours / day',
    value:
      draftWorkingHoursPerDay.value != null
        ? formatNumber(draftWorkingHoursPerDay.value, 2)
        : '—',
  },
])

const capacityRows = computed(() => [
  { label: 'Paid leave / year', value: formatNumber(form.paidLeaveDays, 2) },
  { label: 'Other leave / year', value: formatNumber(form.otherLeaveDays, 2) },
  { label: 'Max daily overtime', value: formatNumber(form.maxOvertimeMinutes, 2) },
  { label: 'Weekend shift FTE', value: formatNumber(form.weekendShiftHc, 2) },
  { label: 'Automation ratio (%)', value: formatPercent(form.automationRatio) },
  { label: 'Working days / year', value: formatNumber(workingDaysPerYear.value, 2) },
  { label: 'Max capacity days', value: formatNumber(draftMaxCapacityDays.value, 2) },
  {
    label: 'Production support FTE',
    value: props.supportFte != null ? formatNumber(props.supportFte, 2) : '—',
  },
  {
    label: 'Daily capacity / agent',
    value: dailyCapacityDisplay.value,
  },
])

function toRequest(): TeamSetupRequest {
  const payload = {
    agentsLt6m: form.agentsLt6m,
    agents6To24m: form.agents6To24m,
    agents24To48m: form.agents24To48m,
    agentsGt48m: form.agentsGt48m,
    paidLeaveDays: form.paidLeaveDays,
    otherLeaveDays: form.otherLeaveDays,
    availabilityRatio: form.availabilityRatio,
    automationRatio: form.automationRatio,
    maxOvertimeMinutes: form.maxOvertimeMinutes,
    slaType: form.slaType || null,
    slaTargetRatio: form.slaTargetRatio,
    slaTurnaroundMinutes: form.slaTurnaroundMinutes,
    slaStartTime: form.slaStartTime || null,
    slaEndTime: form.slaEndTime || null,
    slaWeekendEnabled: hidden.slaWeekendEnabled,
    weekendShiftHc: form.weekendShiftHc,
    skeletonRatio: form.skeletonRatio,
    weekendCode: form.weekendCode || DEFAULT_WEEKEND_CODE,
  }
  return teamSetupRequestSchema.parse(payload)
}

defineExpose({ toRequest })
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AdMetric
        label="Cycle time"
        :value="cycleTimeSeconds != null ? `${formatNumber(cycleTimeSeconds, 2)}s` : '—'"
        hint="TMS-fed, override available"
      />
      <AdMetric
        label="Production support"
        :value="supportFte != null ? formatNumber(supportFte, 2) : '—'"
        hint="FTE from support registry"
      />
      <AdMetric
        label="Daily capacity / agent"
        :value="dailyCapacityDisplay"
        hint="Working hours × availability × 3600 / cycle time"
      />
      <AdMetric
        label="Working days"
        :value="formatNumber(workingDaysPerYear, 2)"
        hint="NETWORKDAYS from weekend code (sizing year)"
      />
    </div>

    <div v-if="readOnly" class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-lg border bg-card p-4">
        <h3 class="mb-3 text-sm font-bold">Basic Info And Headcount</h3>
        <DetailTable :rows="headcountRows" />
      </section>
      <section class="rounded-lg border bg-card p-4">
        <h3 class="mb-3 text-sm font-bold">SLA And Working Hours</h3>
        <DetailTable :rows="slaRows" />
      </section>
      <section class="rounded-lg border bg-card p-4 lg:col-span-2">
        <h3 class="mb-3 text-sm font-bold">Capacity Inputs</h3>
        <DetailTable :rows="capacityRows" />
      </section>
    </div>

    <div v-else class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-lg border bg-card p-4">
        <h3 class="mb-3 text-sm font-bold">Basic Info And Headcount</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm"
            >Agents &lt;6 months
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.agentsLt6m"
              :min="0"
              :decimals="0"
            />
            <ReadOnlyField v-else :value="form.agentsLt6m" />
          </label>
          <label class="grid gap-1 text-sm"
            >Agents 6–24 months
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.agents6To24m"
              :min="0"
              :decimals="0"
            />
            <ReadOnlyField v-else :value="form.agents6To24m" />
          </label>
          <label class="grid gap-1 text-sm"
            >Agents 24–48 months
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.agents24To48m"
              :min="0"
              :decimals="0"
            />
            <ReadOnlyField v-else :value="form.agents24To48m" />
          </label>
          <label class="grid gap-1 text-sm"
            >Agents &gt;48 months
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.agentsGt48m"
              :min="0"
              :decimals="0"
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
                    draftAverageTenureYears != null
                      ? `${formatNumber(draftAverageTenureYears, 1)} years`
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
            />
            <ReadOnlyField v-else :value="formatNumber(form.slaTurnaroundMinutes, 2)" />
          </label>
          <label class="grid gap-1 text-sm"
            >SLA target (%)
            <NumberFieldControl
              v-if="!readOnly"
              v-model="slaTargetPercent"
              :min="0"
              :max="100"
            />
            <ReadOnlyField v-else :value="formatPercent(form.slaTargetRatio)" />
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
            <select
              v-if="!readOnly"
              v-model="form.weekendCode"
              class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              <option
                v-for="option in WEEKEND_CODE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <ReadOnlyField v-else :value="weekendCodeLabel(form.weekendCode)" />
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
            >Availability ratio (%)
            <NumberFieldControl
              v-if="!readOnly"
              v-model="availabilityPercent"
              :min="0"
              :max="100"
            />
            <ReadOnlyField v-else :value="formatPercent(form.availabilityRatio)" />
          </label>
          <label class="grid gap-1 text-sm"
            >Skeleton coverage (%)
            <NumberFieldControl
              v-if="!readOnly"
              v-model="skeletonPercent"
              :min="0"
              :max="100"
            />
            <ReadOnlyField v-else :value="formatPercent(form.skeletonRatio)" />
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
                <TableCell>Working hours / day</TableCell>
                <TableCell>
                  {{
                    draftWorkingHoursPerDay != null
                      ? formatNumber(draftWorkingHoursPerDay, 2)
                      : '—'
                  }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
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
            />
            <ReadOnlyField v-else :value="formatNumber(form.paidLeaveDays, 2)" />
          </label>
          <label class="grid gap-1 text-sm"
            >Other leave / year
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.otherLeaveDays"
              :min="0"
            />
            <ReadOnlyField v-else :value="formatNumber(form.otherLeaveDays, 2)" />
          </label>
          <label class="grid gap-1 text-sm"
            >Max daily overtime
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.maxOvertimeMinutes"
              :min="0"
            />
            <ReadOnlyField v-else :value="formatNumber(form.maxOvertimeMinutes, 2)" />
          </label>
          <label class="grid gap-1 text-sm"
            >Weekend shift FTE
            <NumberFieldControl
              v-if="!readOnly"
              v-model="form.weekendShiftHc"
              :min="0"
            />
            <ReadOnlyField v-else :value="formatNumber(form.weekendShiftHc, 2)" />
          </label>
          <label class="grid gap-1 text-sm"
            >Automation ratio (%)
            <NumberFieldControl
              v-if="!readOnly"
              v-model="automationPercent"
              :min="0"
              :max="100"
            />
            <ReadOnlyField v-else :value="formatPercent(form.automationRatio)" />
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
                <TableCell>{{ formatNumber(workingDaysPerYear, 2) }}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Max capacity days</TableCell>
                <TableCell>{{ formatNumber(draftMaxCapacityDays, 2) }}</TableCell>
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
                  {{ dailyCapacityDisplay }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  </div>
</template>
