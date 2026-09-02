<script setup lang="ts">
import { Info, TriangleAlert } from '@lucide/vue'
import { computed } from 'vue'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatHc } from '@/lib/hcFormat'

import {
  formatKpiLine,
  missingAlignmentLines,
  type TimesheetAlignmentView,
} from '../types'

const props = withDefaults(
  defineProps<{
    alignment?: TimesheetAlignmentView | null
    frozenDeliveryHc?: number | string | null
    frozenSyncDate?: string | null
    audience: 'toolkit' | 'create' | 'exercise' | 'submit' | 'approval'
  }>(),
  {
    alignment: null,
    frozenDeliveryHc: null,
    frozenSyncDate: null,
  },
)

const missing = computed(() => missingAlignmentLines(props.alignment))
const structural = computed(() => Boolean(props.alignment?.structuralDrift))
const currentHc = computed(() => props.alignment?.currentDeliveryHc)
const currentDate = computed(() => props.alignment?.currentMonthlySyncDate || '—')

const hcChanged = computed(() => {
  if (structural.value) return false
  if (props.audience === 'toolkit' || props.audience === 'create') return false
  if (props.frozenDeliveryHc == null || props.frozenDeliveryHc === '') return false
  if (currentHc.value == null || currentHc.value === '') return false
  return Number(props.frozenDeliveryHc) !== Number(currentHc.value)
})

const title = computed(() => {
  if (structural.value && props.audience === 'create') return 'Reconfigure this Toolkit first'
  if (structural.value && props.audience === 'toolkit') {
    return 'This Toolkit is out of sync with the ACTIVE Monthly Timesheet'
  }
  if (structural.value) return 'Scope no longer matches the ACTIVE Monthly Timesheet'
  return 'Frozen Delivery HC'
})

const lead = computed(() => {
  if (!structural.value) {
    return `This exercise froze ${formatHc(props.frozenDeliveryHc, 2)}. Current Monthly Timesheet is ${formatHc(currentHc.value, 2)} (sync ${currentDate.value}). The exercise keeps the frozen value.`
  }
  const count = missing.value.length
  const lines = count
    ? `${count} Shared KPI ${count === 1 ? 'line is' : 'lines are'} no longer in the snapshot.`
    : 'The Supervisor position or PL3 is no longer in the ACTIVE Monthly Timesheet.'
  if (props.audience === 'toolkit') {
    return `${lines} Remove or replace them before saving.`
  }
  if (props.audience === 'create') {
    return `${lines} Update the Toolkit Shared KPI selections, then try again.`
  }
  const frozen = props.frozenSyncDate || '—'
  const prefix = `Frozen ${frozen} · Current ${currentDate.value}. ${lines}`
  if (props.audience === 'submit') {
    return `${prefix} Confirm below to submit using the frozen scope.`
  }
  if (props.audience === 'approval') {
    return `${prefix} Approve to continue with the frozen scope, Return it to the Supervisor, or Reject if the scope is no longer valid.`
  }
  return `${prefix} You can continue this exercise, or delete it and create a new one after updating the Toolkit.`
})
</script>

<template>
  <Alert v-if="structural" variant="warning">
    <TriangleAlert />
    <AlertTitle>{{ title }}</AlertTitle>
    <AlertDescription>
      <p>{{ lead }}</p>
      <ul v-if="missing.length" class="mt-2 list-disc space-y-0.5 pl-4">
        <li v-for="line in missing" :key="formatKpiLine(line)">
          {{ formatKpiLine(line) }}
        </li>
      </ul>
    </AlertDescription>
  </Alert>
  <Alert v-else-if="hcChanged" variant="info">
    <Info />
    <AlertTitle>{{ title }}</AlertTitle>
    <AlertDescription>{{ lead }}</AlertDescription>
  </Alert>
</template>
