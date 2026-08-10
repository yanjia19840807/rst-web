<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { formatDuration } from '../composables/useTmsTimer'
import type { TmsSession } from '../types'
import { formatDate } from '@/lib/datetime'

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

function cycleTime(session: TmsSession) {
  if (!session.processedVolume) return '—'
  return `${Math.round(session.netDurationSeconds / session.processedVolume)}s`
}

const colCount = () => 11 + (props.showAgent ? 1 : 0)
</script>

<template>
  <div class="overflow-x-auto rounded-lg border">
    <Table :class="showAgent ? 'min-w-[1240px]' : 'min-w-[1120px]'">
      <TableHeader>
        <TableRow>
          <TableHead>Session No</TableHead>
          <TableHead v-if="showAgent">Agent</TableHead>
          <TableHead>Toolkit</TableHead>
          <TableHead>Subtask</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Cycle Time</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Volume</TableHead>
          <TableHead>Remarks</TableHead>
          <TableHead class="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="session in sessions" :key="session.id">
          <TableCell class="font-mono text-xs">
            {{ session.id }}
          </TableCell>
          <TableCell v-if="showAgent">{{ session.agentName || '—' }}</TableCell>
          <TableCell>{{ session.toolkitName }}</TableCell>
          <TableCell>{{ session.subtaskName }}</TableCell>
          <TableCell>{{ formatDate(session.startedAt) }}</TableCell>
          <TableCell>{{ formatDate(session.endedAt) }}</TableCell>
          <TableCell>{{ formatDuration(session.netDurationSeconds) }}</TableCell>
          <TableCell>{{ cycleTime(session) }}</TableCell>
          <TableCell>{{ session.reference || '—' }}</TableCell>
          <TableCell>{{ session.processedVolume ?? '—' }}</TableCell>
          <TableCell class="max-w-52 truncate">{{ session.remarks || '—' }}</TableCell>
          <TableCell class="text-right">
            <div class="flex items-center justify-end gap-3">
              <Button
                size="sm"
                variant="link"
                class="h-auto px-0 font-semibold"
                @click="emit('open', session.id)"
              >
                View
              </Button>
              <Button
                v-if="canDelete"
                size="sm"
                variant="link-destructive"
                class="h-auto px-0 font-semibold"
                :disabled="deletingId === session.id"
                @click="emit('delete', session.id)"
              >
                Delete
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-if="!pending && sessions.length === 0">
          <TableCell :colspan="colCount()" class="h-24 text-center text-muted-foreground">
            No sessions found.
          </TableCell>
        </TableRow>
        <TableRow v-if="pending">
          <TableCell :colspan="colCount()" class="h-24 text-center text-muted-foreground">
            Loading sessions…
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
