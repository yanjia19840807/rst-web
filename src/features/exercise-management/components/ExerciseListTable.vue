<script setup lang="ts">
import { computed } from 'vue'

import { DataTable } from '@/components/ui/data-table'

import type { Exercise } from '../types'
import { IN_PROGRESS_TAB } from '../workflowLabels'
import { createExerciseListColumns } from './exerciseListColumns'

type TabKey = typeof IN_PROGRESS_TAB | 'Archived'

const props = defineProps<{
  activeTab: TabKey
  rows: Exercise[]
  loading: boolean
}>()

const emit = defineEmits<{
  open: [exercise: Exercise]
  withdraw: [exercise: Exercise]
}>()

const columns = computed(() =>
  createExerciseListColumns({
    onOpen: (exercise) => emit('open', exercise),
    onWithdraw: (exercise) => emit('withdraw', exercise),
  }),
)

const columnVisibility = computed(() => {
  const inProgress = props.activeTab === IN_PROGRESS_TAB
  return {
    currentStep: inProgress,
    currentReviewer: inProgress,
    aging: inProgress,
    archivedAt: !inProgress,
    status: !inProgress,
  }
})
</script>

<template>
  <DataTable
    :columns="columns"
    :data="rows"
    :pending="loading"
    :empty-text="`No ${activeTab} exercises.`"
    :table-class="activeTab === IN_PROGRESS_TAB ? 'min-w-[1280px]' : 'min-w-[1200px]'"
    :get-row-id="(row) => row.id"
    :column-visibility="columnVisibility"
  />
</template>
