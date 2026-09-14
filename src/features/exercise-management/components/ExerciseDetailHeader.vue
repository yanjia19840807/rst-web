<script setup lang="ts">
import { Info } from '@lucide/vue'

import DetailTable from '@/components/DetailTable.vue'
import { infoHintButtonClass, infoHintIconClass } from '@/components/ui/alert'
import StatusBadge from '@/components/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/datetime'

import type { Exercise } from '../types'
import { currentStepLabel, isReturned } from '../workflowLabels'

defineProps<{
  exercise: Exercise
  locked: boolean
}>()

const emit = defineEmits<{
  editPeriods: []
  toolkitInfo: []
}>()
</script>

<template>
  <Card>
    <CardHeader class="items-center">
      <CardTitle class="text-base">Exercise Info</CardTitle>
      <CardAction v-if="!locked">
        <Button variant="outline" @click="emit('editPeriods')">Edit Periods</Button>
      </CardAction>
    </CardHeader>
    <CardContent class="grid gap-3">
      <DetailTable
        :rows="[
          { key: 'toolkit', label: 'Toolkit', value: exercise.snapshot.toolkit.name },
          { label: 'Exercise No', value: exercise.exerciseCode },
          { label: 'Created', value: formatDate(exercise.createdAt) },
          { label: 'Sizing Month', value: exercise.sizingMonth },
          { key: 'status', label: 'Current Step', value: currentStepLabel(exercise) },
        ]"
      >
        <template #toolkit="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <span>{{ row.value || '—' }}</span>
            <button
              type="button"
              :class="infoHintButtonClass"
              title="Toolkit info"
              @click="emit('toolkitInfo')"
            >
              <Info :class="infoHintIconClass" />
              <span class="sr-only">Toolkit info</span>
            </button>
          </span>
        </template>
        <template #status="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <span>{{ row.value || '—' }}</span>
            <StatusBadge v-if="isReturned(exercise)" status="Returned" />
          </span>
        </template>
      </DetailTable>
    </CardContent>
  </Card>
</template>
