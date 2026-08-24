<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { computed, watch } from 'vue'
import { useForm } from 'vee-validate'

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

import {
  emptyTeamSetupForm,
  teamSetupFormSchema,
  teamSetupToForm,
  toTeamSetupRequest,
  type TeamSetupFormValues,
} from '../../schemas/teamSetup'
import type { TeamSetup, TeamSetupRequest } from '../../types'
import { computeNetworkDays } from '../../workingDays'
import {
  DEFAULT_WEEKEND_CODE,
  WEEKEND_CODE_OPTIONS,
  weekendCodeLabel,
} from '../../weekendCodes'
import { FieldUnit, withUnit } from '../../fieldUnits'
import AdMetric from './AdMetric.vue'
import { formatNumber } from './adTypes'

const props = defineProps<{
  modelValue: TeamSetup | null
  cycleTimeSeconds?: number | null
  supportFte?: number | null
  sizingMonth?: string | null
  readOnly?: boolean
}>()

const { defineField, errors, resetForm, validate, values } = useForm<TeamSetupFormValues>({
  validationSchema: toTypedSchema(teamSetupFormSchema),
  initialValues: emptyTeamSetupForm(),
  validateOnMount: false,
})

const [agentsLt6m] = defineField('agentsLt6m')
const [agents6To24m] = defineField('agents6To24m')
const [agents24To48m] = defineField('agents24To48m')
const [agentsGt48m] = defineField('agentsGt48m')
const [paidLeaveDays] = defineField('paidLeaveDays')
const [otherLeaveDays] = defineField('otherLeaveDays')
const [weekendCode] = defineField('weekendCode')
const [availabilityRatio] = defineField('availabilityRatio')
const [automationRatio] = defineField('automationRatio')
const [maxOvertimeMinutes] = defineField('maxOvertimeMinutes')
const [slaType] = defineField('slaType')
const [slaTargetRatio] = defineField('slaTargetRatio')
const [slaTurnaroundMinutes] = defineField('slaTurnaroundMinutes')
const [slaStartTime] = defineField('slaStartTime')
const [slaEndTime] = defineField('slaEndTime')
const [weekendShiftHc] = defineField('weekendShiftHc')
const [skeletonRatio] = defineField('skeletonRatio')
defineField('slaWeekendEnabled')

watch(
  () => props.modelValue,
  (setup) => {
    resetForm({
      values: setup ? teamSetupToForm(setup) : emptyTeamSetupForm(),
    })
  },
  { immediate: true },
)

const draftTotalAgents = computed(() =>
  [values.agentsLt6m, values.agents6To24m, values.agents24To48m, values.agentsGt48m].reduce(
    (sum: number, value) => sum + (value ?? 0),
    0,
  ),
)

/** Live preview; Excel Input C10: (3·&lt;6m + 15·6–24m + 36·24–48m + 48·&gt;48m) / 12 / total. */
const draftAverageTenureYears = computed(() => {
  const total = draftTotalAgents.value
  if (total <= 0) return null
  const weightedMonths =
    (values.agentsLt6m ?? 0) * 3 +
    (values.agents6To24m ?? 0) * 15 +
    (values.agents24To48m ?? 0) * 36 +
    (values.agentsGt48m ?? 0) * 48
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
  return percent == null ? '—' : formatNumber(percent, 2)
}

function percentModel(
  key: 'slaTargetRatio' | 'availabilityRatio' | 'skeletonRatio' | 'automationRatio',
) {
  return computed({
    get: () => ratioToPercent(values[key]),
    set: (value: number | null) => {
      const next = percentToRatio(value)
      if (key === 'slaTargetRatio') slaTargetRatio.value = next
      else if (key === 'availabilityRatio') availabilityRatio.value = next
      else if (key === 'skeletonRatio') skeletonRatio.value = next
      else automationRatio.value = next
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
  const start = parseClockToMinutes(values.slaStartTime)
  const end = parseClockToMinutes(values.slaEndTime)
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
  const availability = values.availabilityRatio
  const cycleTime = props.cycleTimeSeconds != null ? Number(props.cycleTimeSeconds) : NaN
  if (hours == null || availability == null || !Number.isFinite(cycleTime) || cycleTime <= 0) {
    return null
  }
  return Math.round(((hours * availability * 3600) / cycleTime) * 1e6) / 1e6
})

const dailyCapacityDisplay = computed(() => {
  if (draftDailyCapacityPerAgent.value != null) {
    return formatNumber(draftDailyCapacityPerAgent.value, 0)
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
  return computeNetworkDays(year, values.weekendCode, [])
})

/** Live: WorkingDays − paidLeave − otherLeave. Matches backend. */
const draftMaxCapacityDays = computed(() => {
  const workingDays = workingDaysPerYear.value
  if (workingDays == null) return null
  return workingDays - (values.paidLeaveDays ?? 0) - (values.otherLeaveDays ?? 0)
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
  { label: withUnit('Agents <6 months', FieldUnit.hc), value: values.agentsLt6m },
  { label: withUnit('Agents 6–24 months', FieldUnit.hc), value: values.agents6To24m },
  { label: withUnit('Agents 24–48 months', FieldUnit.hc), value: values.agents24To48m },
  { label: withUnit('Agents >48 months', FieldUnit.hc), value: values.agentsGt48m },
  { label: withUnit('Total agents', FieldUnit.hc), value: draftTotalAgents.value || '—' },
  {
    label: withUnit('Average tenure', FieldUnit.years),
    value:
      draftAverageTenureYears.value != null
        ? formatNumber(draftAverageTenureYears.value, 1)
        : '—',
  },
])

const slaRows = computed(() => [
  { label: withUnit('SLA turntime', FieldUnit.minutes), value: formatNumber(values.slaTurnaroundMinutes, 2) },
  { label: withUnit('SLA target', FieldUnit.percent), value: formatPercent(values.slaTargetRatio) },
  { label: 'SLA type', value: slaTypeLabel(values.slaType) },
  { label: 'Weekend code', value: weekendCodeLabel(values.weekendCode) },
  { label: 'SLA clock start', value: values.slaStartTime || '—' },
  { label: 'SLA clock end', value: values.slaEndTime || '—' },
  { label: withUnit('Availability ratio', FieldUnit.percent), value: formatPercent(values.availabilityRatio) },
  { label: withUnit('Skeleton coverage', FieldUnit.percent), value: formatPercent(values.skeletonRatio) },
  {
    label: withUnit('Working hours / day', FieldUnit.hours),
    value:
      draftWorkingHoursPerDay.value != null
        ? formatNumber(draftWorkingHoursPerDay.value, 2)
        : '—',
  },
])

const capacityRows = computed(() => [
  { label: withUnit('Paid leave / year', FieldUnit.days), value: formatNumber(values.paidLeaveDays, 2) },
  { label: withUnit('Other leave / year', FieldUnit.days), value: formatNumber(values.otherLeaveDays, 2) },
  { label: withUnit('Max daily overtime', FieldUnit.minutes), value: formatNumber(values.maxOvertimeMinutes, 2) },
  { label: withUnit('Weekend shift', FieldUnit.fte), value: formatNumber(values.weekendShiftHc, 2) },
  { label: withUnit('Automation ratio', FieldUnit.percent), value: formatPercent(values.automationRatio) },
  { label: withUnit('Working days / year', FieldUnit.days), value: formatNumber(workingDaysPerYear.value, 2) },
  { label: withUnit('Max capacity days', FieldUnit.days), value: formatNumber(draftMaxCapacityDays.value, 2) },
  {
    label: withUnit('Production support', FieldUnit.fte),
    value: props.supportFte != null ? formatNumber(props.supportFte, 2) : '—',
  },
  {
    label: withUnit('Daily capacity / agent', FieldUnit.transactions),
    value: dailyCapacityDisplay.value,
  },
])

async function toRequest(): Promise<TeamSetupRequest | null> {
  const result = await validate()
  if (!result.valid) return null
  return toTeamSetupRequest(values)
}

defineExpose({ toRequest })
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AdMetric
        :label="withUnit('Cycle time', FieldUnit.seconds)"
        :value="cycleTimeSeconds != null ? formatNumber(cycleTimeSeconds, 2) : '—'"
        hint="TMS-fed, override available"
      />
      <AdMetric
        :label="withUnit('Production support', FieldUnit.fte)"
        :value="supportFte != null ? formatNumber(supportFte, 2) : '—'"
        hint="FTE from support registry"
      />
      <AdMetric
        :label="withUnit('Daily capacity / agent', FieldUnit.transactions)"
        :value="dailyCapacityDisplay"
        hint="Working hours × availability × 3600 / cycle time"
      />
      <AdMetric
        :label="withUnit('Working days', FieldUnit.days)"
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
            >{{ withUnit('Agents <6 months', FieldUnit.hc) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="agentsLt6m"
              :min="0"
              :decimals="0"
              :invalid="Boolean(errors.agentsLt6m)"
            />
            <ReadOnlyField v-else :value="agentsLt6m" />
            <p v-if="errors.agentsLt6m" class="text-xs text-destructive">{{ errors.agentsLt6m }}</p>
          </label>
          <label class="grid gap-1 text-sm"
            >{{ withUnit('Agents 6–24 months', FieldUnit.hc) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="agents6To24m"
              :min="0"
              :decimals="0"
              :invalid="Boolean(errors.agents6To24m)"
            />
            <ReadOnlyField v-else :value="agents6To24m" />
            <p v-if="errors.agents6To24m" class="text-xs text-destructive">{{ errors.agents6To24m }}</p>
          </label>
          <label class="grid gap-1 text-sm"
            >{{ withUnit('Agents 24–48 months', FieldUnit.hc) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="agents24To48m"
              :min="0"
              :decimals="0"
              :invalid="Boolean(errors.agents24To48m)"
            />
            <ReadOnlyField v-else :value="agents24To48m" />
            <p v-if="errors.agents24To48m" class="text-xs text-destructive">{{ errors.agents24To48m }}</p>
          </label>
          <label class="grid gap-1 text-sm"
            >{{ withUnit('Agents >48 months', FieldUnit.hc) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="agentsGt48m"
              :min="0"
              :decimals="0"
              :invalid="Boolean(errors.agentsGt48m)"
            />
            <ReadOnlyField v-else :value="agentsGt48m" />
            <p v-if="errors.agentsGt48m" class="text-xs text-destructive">{{ errors.agentsGt48m }}</p>
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
                <TableCell>{{ withUnit('Total agents', FieldUnit.hc) }}</TableCell>
                <TableCell>{{ draftTotalAgents || '—' }}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{{ withUnit('Average tenure', FieldUnit.years) }}</TableCell>
                <TableCell>
                  {{
                    draftAverageTenureYears != null
                      ? formatNumber(draftAverageTenureYears, 1)
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
            >{{ withUnit('SLA turntime', FieldUnit.minutes) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="slaTurnaroundMinutes"
              :min="0"
              :invalid="Boolean(errors.slaTurnaroundMinutes)"
            />
            <ReadOnlyField v-else :value="formatNumber(slaTurnaroundMinutes, 2)" />
            <p v-if="errors.slaTurnaroundMinutes" class="text-xs text-destructive">
              {{ errors.slaTurnaroundMinutes }}
            </p>
          </label>
          <label class="grid gap-1 text-sm"
            >{{ withUnit('SLA target', FieldUnit.percent) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="slaTargetPercent"
              :min="0"
              :max="100"
              :invalid="Boolean(errors.slaTargetRatio)"
            />
            <ReadOnlyField v-else :value="formatPercent(slaTargetRatio)" />
            <p v-if="errors.slaTargetRatio" class="text-xs text-destructive">
              {{ errors.slaTargetRatio }}
            </p>
          </label>
          <label class="grid gap-1 text-sm"
            >SLA type
            <select
              v-if="!readOnly"
              v-model="slaType"
              class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              :aria-invalid="Boolean(errors.slaType)"
            >
              <option value="">Select…</option>
              <option value="BUSINESS_HOURS">Working Hours</option>
              <option value="CALENDAR_HOURS">Calendar Hours</option>
            </select>
            <ReadOnlyField v-else :value="slaType" />
            <p v-if="errors.slaType" class="text-xs text-destructive">{{ errors.slaType }}</p>
          </label>
          <label class="grid gap-1 text-sm">
            Weekend code
            <select
              v-if="!readOnly"
              v-model="weekendCode"
              class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              :aria-invalid="Boolean(errors.weekendCode)"
            >
              <option
                v-for="option in WEEKEND_CODE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <ReadOnlyField v-else :value="weekendCodeLabel(weekendCode)" />
            <p v-if="errors.weekendCode" class="text-xs text-destructive">{{ errors.weekendCode }}</p>
          </label>
          <label class="grid gap-1 text-sm"
            >SLA clock start
            <TimePicker
              v-if="!readOnly"
              v-model="slaStartTime"
              aria-label="SLA clock start"
              :invalid="Boolean(errors.slaStartTime)"
            />
            <ReadOnlyField v-else :value="slaStartTime" />
            <p v-if="errors.slaStartTime" class="text-xs text-destructive">{{ errors.slaStartTime }}</p>
          </label>
          <label class="grid gap-1 text-sm"
            >SLA clock end
            <TimePicker
              v-if="!readOnly"
              v-model="slaEndTime"
              aria-label="SLA clock end"
              :invalid="Boolean(errors.slaEndTime)"
            />
            <ReadOnlyField v-else :value="slaEndTime" />
            <p v-if="errors.slaEndTime" class="text-xs text-destructive">{{ errors.slaEndTime }}</p>
          </label>
          <label class="grid gap-1 text-sm"
            >{{ withUnit('Availability ratio', FieldUnit.percent) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="availabilityPercent"
              :min="0"
              :max="100"
              :invalid="Boolean(errors.availabilityRatio)"
            />
            <ReadOnlyField v-else :value="formatPercent(availabilityRatio)" />
            <p v-if="errors.availabilityRatio" class="text-xs text-destructive">
              {{ errors.availabilityRatio }}
            </p>
          </label>
          <label class="grid gap-1 text-sm"
            >{{ withUnit('Skeleton coverage', FieldUnit.percent) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="skeletonPercent"
              :min="0"
              :max="100"
              :invalid="Boolean(errors.skeletonRatio)"
            />
            <ReadOnlyField v-else :value="formatPercent(skeletonRatio)" />
            <p v-if="errors.skeletonRatio" class="text-xs text-destructive">
              {{ errors.skeletonRatio }}
            </p>
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
                <TableCell>{{ withUnit('Working hours / day', FieldUnit.hours) }}</TableCell>
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
            >{{ withUnit('Paid leave / year', FieldUnit.days) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="paidLeaveDays"
              :min="0"
              :invalid="Boolean(errors.paidLeaveDays)"
            />
            <ReadOnlyField v-else :value="formatNumber(paidLeaveDays, 2)" />
            <p v-if="errors.paidLeaveDays" class="text-xs text-destructive">{{ errors.paidLeaveDays }}</p>
          </label>
          <label class="grid gap-1 text-sm"
            >{{ withUnit('Other leave / year', FieldUnit.days) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="otherLeaveDays"
              :min="0"
              :invalid="Boolean(errors.otherLeaveDays)"
            />
            <ReadOnlyField v-else :value="formatNumber(otherLeaveDays, 2)" />
            <p v-if="errors.otherLeaveDays" class="text-xs text-destructive">{{ errors.otherLeaveDays }}</p>
          </label>
          <label class="grid gap-1 text-sm"
            >{{ withUnit('Max daily overtime', FieldUnit.minutes) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="maxOvertimeMinutes"
              :min="0"
              :invalid="Boolean(errors.maxOvertimeMinutes)"
            />
            <ReadOnlyField v-else :value="formatNumber(maxOvertimeMinutes, 2)" />
            <p v-if="errors.maxOvertimeMinutes" class="text-xs text-destructive">
              {{ errors.maxOvertimeMinutes }}
            </p>
          </label>
          <label class="grid gap-1 text-sm"
            >{{ withUnit('Weekend shift', FieldUnit.fte) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="weekendShiftHc"
              :min="0"
              :invalid="Boolean(errors.weekendShiftHc)"
            />
            <ReadOnlyField v-else :value="formatNumber(weekendShiftHc, 2)" />
            <p v-if="errors.weekendShiftHc" class="text-xs text-destructive">
              {{ errors.weekendShiftHc }}
            </p>
          </label>
          <label class="grid gap-1 text-sm"
            >{{ withUnit('Automation ratio', FieldUnit.percent) }}
            <NumberFieldControl
              v-if="!readOnly"
              v-model="automationPercent"
              :min="0"
              :max="100"
              :invalid="Boolean(errors.automationRatio)"
            />
            <ReadOnlyField v-else :value="formatPercent(automationRatio)" />
            <p v-if="errors.automationRatio" class="text-xs text-destructive">
              {{ errors.automationRatio }}
            </p>
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
                <TableCell>{{ withUnit('Working days / year', FieldUnit.days) }}</TableCell>
                <TableCell>{{ formatNumber(workingDaysPerYear, 2) }}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{{ withUnit('Max capacity days', FieldUnit.days) }}</TableCell>
                <TableCell>{{ formatNumber(draftMaxCapacityDays, 2) }}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{{ withUnit('Production support', FieldUnit.fte) }}</TableCell>
                <TableCell>
                  {{ supportFte != null ? formatNumber(supportFte, 2) : '—' }}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{{ withUnit('Daily capacity / agent', FieldUnit.transactions) }}</TableCell>
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
