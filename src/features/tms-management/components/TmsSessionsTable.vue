<script setup lang="ts">
import { computed } from 'vue'

import { DataTable } from '@/components/ui/data-table'

import type { TmsSession } from '../types'
import { createTmsSessionColumns } from './tmsSessionColumns'

const props = withDefaults(
  defineProps<{
    sessions: TmsSession[]
    pending?: boolean
    deletingId?: string
    showAgent?: boolean
    canDelete?: boolean
  }>(),
  {
    showAgent: false,
    canDelete: true,
  },
)

const emit = defineEmits<{
  delete: [id: string]
  open: [id: string]
}>()

const columns = computed(() =>
  createTmsSessionColumns({
    canDelete: props.canDelete,
    deletingId: props.deletingId,
    onOpen: (id) => emit('open', id),
    onDelete: (id) => emit('delete', id),
  }),
)

const columnVisibility = computed(() => ({
  agent: props.showAgent,
}))
</script>

<template>
  <DataTable
    :columns="columns"
    :data="sessions"
    :pending="pending"
    empty-text="No sessions found."
    :table-class="showAgent ? 'min-w-[1240px]' : 'min-w-[1120px]'"
    :get-row-id="(row) => row.id"
    :column-visibility="columnVisibility"
  />
</template>
