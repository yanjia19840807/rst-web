<script setup lang="ts">
import { computed } from 'vue'

import { DataTable } from '@/components/ui/data-table'

import type { Exercise } from '../types'
import { IN_PROGRESS_TAB, VALIDATED_TAB } from '../workflowLabels'
import { createExerciseListColumns } from './exerciseListColumns'

type TabKey = typeof IN_PROGRESS_TAB | typeof VALIDATED_TAB

const props = defineProps<{
  activeTab: TabKey
  rows: Exercise[]
  loading: boolean
}>()

const emit = defineEmits<{
  open: [exercise: Exercise]
  toolkitInfo: [exercise: Exercise]
}>()

const columns = computed(() =>
  createExerciseListColumns({
    onOpen: (exercise) => emit('open', exercise),
    onToolkitInfo: (exercise) => emit('toolkitInfo', exercise),
  }),
)

const columnVisibility = computed(() => {
  const inProgress = props.activeTab === IN_PROGRESS_TAB
  return {
    submittedAt: inProgress,
    archivedAt: !inProgress,
    currentStep: inProgress,
    currentReviewer: inProgress,
    aging: inProgress,
  }
})
</script>

<template>
  <DataTable
    :columns="columns"
    :data="rows"
    :pending="loading"
    :empty-text="`No ${activeTab} exercises.`"
    :table-class="activeTab === IN_PROGRESS_TAB ? 'min-w-[2400px]' : 'min-w-[2100px]'"
    :get-row-id="(row) => row.id"
    :column-visibility="columnVisibility"
  />
</template>
