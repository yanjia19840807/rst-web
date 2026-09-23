<script setup lang="ts">
import { computed } from 'vue'

import DetailTable from '@/components/DetailTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatInstantForCenter } from '@/lib/datetime'

import CreatedByText from '@/components/CreatedByText.vue'
import { actorLabel, ownerLabel, sameAuditActor } from '@/lib/auditActor'
import type { Exercise } from '../types'
import { currentStepLabel, isReturned } from '../workflowLabels'
import ToolkitInfoPanel from './ToolkitInfoPanel.vue'

const props = withDefaults(
  defineProps<{
    exercise: Exercise
    locked: boolean
    showCurrentStep?: boolean
  }>(),
  { showCurrentStep: true },
)

const emit = defineEmits<{
  editPeriods: []
}>()

const exerciseRows = computed(() => {
  const rows: Array<{ key?: string; label: string; value: string }> = [
    { label: 'Exercise No', value: props.exercise.exerciseCode },
    {
      label: 'Created at',
      value: formatInstantForCenter(
        props.exercise.createdAt,
        props.exercise.snapshot.toolkit.center,
      ),
    },
  ]
  if (ownerLabel(props.exercise.createdBy)) {
    rows.push({
      key: 'createdBy',
      label: 'Created by',
      value: '',
    })
  }
  if (
    actorLabel(props.exercise.updatedBy)
    && !sameAuditActor(props.exercise.createdBy, props.exercise.updatedBy)
  ) {
    rows.push({
      key: 'updatedBy',
      label: 'Last updated by',
      value: '',
    })
  }
  if (props.exercise.submittedAt) {
    rows.push({
      label: 'Submitted at',
      value: formatInstantForCenter(
        props.exercise.submittedAt,
        props.exercise.snapshot.toolkit.center,
      ),
    })
  }
  if (props.exercise.archivedAt) {
    rows.push({
      label: 'Validated at',
      value: formatInstantForCenter(
        props.exercise.archivedAt,
        props.exercise.snapshot.toolkit.center,
      ),
    })
  }
  rows.push({ label: 'Sizing Month', value: props.exercise.sizingMonth })
  if (props.showCurrentStep) {
    rows.push({
      key: 'status',
      label: 'Current Step',
      value: currentStepLabel(props.exercise),
    })
  }
  return rows
})
</script>

<template>
  <Card>
    <CardHeader class="items-center">
      <CardTitle class="text-base">Exercise Info</CardTitle>
      <CardAction v-if="!locked">
        <Button variant="outline" @click="emit('editPeriods')">Edit Periods</Button>
      </CardAction>
    </CardHeader>
    <CardContent class="grid gap-4">
      <DetailTable :rows="exerciseRows">
        <template #createdBy>
          <CreatedByText :actor="exercise.createdBy" />
        </template>
        <template #updatedBy>
          <CreatedByText :actor="exercise.updatedBy" />
        </template>
        <template #status="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <span>{{ row.value || '—' }}</span>
            <StatusBadge v-if="isReturned(exercise)" status="Returned" />
          </span>
        </template>
      </DetailTable>

      <ToolkitInfoPanel
        embedded
        show-delivery-hc
        :snapshot="exercise.snapshot"
        :alignment="exercise.timesheetAlignment"
      />
    </CardContent>
  </Card>
</template>
