<script setup lang="ts">
import { computed } from 'vue'

import { DataTable } from '@/components/ui/data-table'

import type { TmsSession } from '../types'
import { createTmsSessionColumns } from './tmsSessionColumns'

const props = withDefaults(
  defineProps<{
    sessions: TmsSession[]
    pending?: boolean
    togglingId?: string
    showAgent?: boolean
    showStatus?: boolean
    canToggleEnabled?: boolean
  }>(),
  {
    showAgent: false,
    showStatus: true,
    canToggleEnabled: false,
  },
)

const emit = defineEmits<{
  toggleEnabled: [id: string]
  open: [id: string]
}>()

const columns = computed(() =>
  createTmsSessionColumns({
    showStatus: props.showStatus,
    canToggleEnabled: props.canToggleEnabled,
    togglingId: props.togglingId,
    onOpen: (id) => emit('open', id),
    onToggleEnabled: (id) => emit('toggleEnabled', id),
  }),
)

const columnVisibility = computed(() => ({
  agent: props.showAgent,
  enabled: props.showStatus,
}))
</script>

<template>
  <DataTable
    :columns="columns"
    :data="sessions"
    :pending="pending"
    empty-text="No sessions found."
    :table-class="showAgent ? 'min-w-[1320px]' : 'min-w-[1240px]'"
    :get-row-id="(row) => row.id"
    :column-visibility="columnVisibility"
  />
</template>
