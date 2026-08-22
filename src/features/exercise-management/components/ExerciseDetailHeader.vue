<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed } from 'vue'

import DetailTable from '@/components/DetailTable.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/datetime'

import {
  SIZING_MONTH_HINT_DESCRIPTION,
  SLOT_PERIOD_HINT_DESCRIPTION,
  TMS_PERIOD_HINT_DESCRIPTION,
  sizingHintLines,
  slotHintLines,
  tmsHintLines,
} from '../periodWindows'
import type { Exercise } from '../types'
import { currentStepLabel, isReturned } from '../workflowLabels'
import PeriodDerivedHints from './PeriodDerivedHints.vue'

const props = defineProps<{
  exercise: Exercise
  locked: boolean
}>()

const emit = defineEmits<{
  editPeriods: []
  toolkitInfo: []
}>()

const sizingHints = computed(() => sizingHintLines(props.exercise.sizingMonth))
const slotHints = computed(() =>
  slotHintLines(props.exercise.slotStartDate, props.exercise.slotWeeks),
)
const tmsHints = computed(() => tmsHintLines(props.exercise.tmsFrom, props.exercise.tmsTo))
const slotPeriodSummary = computed(() => {
  const weeks = props.exercise.slotWeeks
  const weekLabel = weeks === 1 ? '1 week' : `${weeks} weeks`
  return `${formatDate(props.exercise.slotStartDate)} · ${weekLabel}`
})
</script>

<template>
  <Card>
    <CardHeader class="items-center">
      <CardTitle class="text-base">Exercise Info</CardTitle>
      <CardAction v-if="!locked">
        <Button size="sm" variant="outline" @click="emit('editPeriods')">Edit Periods</Button>
      </CardAction>
    </CardHeader>
    <CardContent class="grid gap-3">
      <DetailTable
        :rows="[
          { key: 'toolkit', label: 'Toolkit', value: exercise.snapshot.toolkit.name },
          { label: 'Exercise No', value: exercise.exerciseCode },
          { label: 'Created', value: formatDate(exercise.createdAt) },
          { key: 'sizingMonth', label: 'Sizing Month', value: exercise.sizingMonth },
          { key: 'slotPeriod', label: 'Slot Period', value: slotPeriodSummary },
          {
            key: 'tmsPeriod',
            label: 'TMS period',
            value: `${formatDate(exercise.tmsFrom)} – ${formatDate(exercise.tmsTo)}`,
          },
          { key: 'status', label: 'Current Step', value: currentStepLabel(exercise) },
        ]"
      >
        <template #toolkit="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <span>{{ row.value || '—' }}</span>
            <button
              type="button"
              class="inline-flex size-5 items-center justify-center rounded text-primary hover:bg-primary/10"
              title="Toolkit info"
              @click="emit('toolkitInfo')"
            >
              <Info class="size-3.5" />
              <span class="sr-only">Toolkit info</span>
            </button>
          </span>
        </template>
        <template #sizingMonth="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <span>{{ row.value || '—' }}</span>
            <PeriodDerivedHints
              title="Sizing Month"
              :description="SIZING_MONTH_HINT_DESCRIPTION"
              :lines="sizingHints"
            />
          </span>
        </template>
        <template #slotPeriod="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <span>{{ row.value || '—' }}</span>
            <PeriodDerivedHints
              title="Slot Period"
              :description="SLOT_PERIOD_HINT_DESCRIPTION"
              :lines="slotHints"
            />
          </span>
        </template>
        <template #tmsPeriod="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <span>{{ row.value || '—' }}</span>
            <PeriodDerivedHints
              title="TMS period"
              :description="TMS_PERIOD_HINT_DESCRIPTION"
              :lines="tmsHints"
            />
          </span>
        </template>
        <template #status="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <span>{{ row.value || '—' }}</span>
            <Badge v-if="isReturned(exercise)" variant="outline">Returned</Badge>
          </span>
        </template>
      </DetailTable>
      <div
        v-if="!locked"
        class="rounded-md bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-foreground"
      >
        Associated Data initialized from the latest Approved archive. Volume Input is pre-filled
        from Toolkit volume when available. Edit below — all scenarios in this exercise share this
        baseline.
      </div>
    </CardContent>
  </Card>
</template>
