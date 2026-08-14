<script setup lang="ts">
import { Info } from '@lucide/vue'
import { computed } from 'vue'

import DetailTable from '@/components/DetailTable.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/datetime'

import { sizingHintLines, slotHintLines } from '../periodWindows'
import type { Exercise } from '../types'
import { exerciseStatusLabel } from '../workflowLabels'
import PeriodDerivedHints from './PeriodDerivedHints.vue'

const props = defineProps<{
  exercise: Exercise
  deliveryHc: number
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
        <Button size="sm" variant="outline" @click="emit('editPeriods')">Edit</Button>
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
            label: 'TMS period',
            value: `${formatDate(exercise.tmsFrom)} – ${formatDate(exercise.tmsTo)}`,
          },
          { label: 'Status', value: exerciseStatusLabel(exercise) },
          { label: 'Delivery HC', value: deliveryHc.toFixed(2) },
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
          <div>
            <div>{{ row.value || '—' }}</div>
            <PeriodDerivedHints :lines="sizingHints" />
          </div>
        </template>
        <template #slotPeriod="{ row }">
          <div>
            <div>{{ row.value || '—' }}</div>
            <PeriodDerivedHints :lines="slotHints" />
          </div>
        </template>
      </DetailTable>
      <div
        v-if="!locked"
        class="rounded-md bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-foreground"
      >
        Associated Data initialized from the latest Approved archive. Volume Input covers training
        windows only (not forecast periods); overlapping archive volume is seeded. Edit below —
        all scenarios in this exercise share this baseline.
      </div>
    </CardContent>
  </Card>
</template>
