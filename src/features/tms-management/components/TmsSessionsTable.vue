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
    showToolkitInfo?: boolean
    canToggleEnabled?: boolean
  }>(),
  {
    showAgent: false,
    showStatus: true,
    showToolkitInfo: false,
    canToggleEnabled: false,
  },
)

const emit = defineEmits<{
  toggleEnabled: [id: string]
  open: [id: string]
  toolkitInfo: [session: TmsSession]
}>()

const columns = computed(() =>
  createTmsSessionColumns({
    showStatus: props.showStatus,
    showToolkitScope: true,
    canToggleEnabled: props.canToggleEnabled,
    togglingId: props.togglingId,
    onOpen: (id) => emit('open', id),
    onToggleEnabled: (id) => emit('toggleEnabled', id),
    onToolkitInfo: props.showToolkitInfo
      ? (row) => {
          const session = props.sessions.find((item) => item.id === row.id)
          if (session) emit('toolkitInfo', session)
        }
      : undefined,
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
    :table-class="showAgent ? 'min-w-[2280px]' : 'min-w-[2160px]'"
    :get-row-id="(row) => row.id"
    :column-visibility="columnVisibility"
  />
</template>
