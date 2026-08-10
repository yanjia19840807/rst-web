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

defineProps<{
  sessions: TmsSession[]
  pending?: boolean
  deletingId?: string
}>()

const emit = defineEmits<{
  delete: [id: string]
  open: [id: string]
}>()

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function cycleTime(session: TmsSession) {
  if (!session.processedVolume) return '—'
  return `${Math.round(session.netDurationSeconds / session.processedVolume)}s`
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border">
    <Table class="min-w-[1120px]">
      <TableHeader>
        <TableRow>
          <TableHead>Session No</TableHead>
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
        <TableRow
          v-for="session in sessions"
          :key="session.id"
          class="cursor-pointer hover:bg-muted/40"
          @click="emit('open', session.id)"
        >
          <TableCell class="font-mono text-xs text-primary underline-offset-2 hover:underline">
            {{ session.id }}
          </TableCell>
          <TableCell>{{ session.toolkitName }}</TableCell>
          <TableCell>{{ session.subtaskName }}</TableCell>
          <TableCell>{{ formatDate(session.startedAt) }}</TableCell>
          <TableCell>{{ formatDate(session.endedAt) }}</TableCell>
          <TableCell>{{ formatDuration(session.netDurationSeconds) }}</TableCell>
          <TableCell>{{ cycleTime(session) }}</TableCell>
          <TableCell>{{ session.reference || '—' }}</TableCell>
          <TableCell>{{ session.processedVolume ?? '—' }}</TableCell>
          <TableCell class="max-w-52 truncate">{{ session.remarks || '—' }}</TableCell>
          <TableCell class="text-right" @click.stop>
            <Button
              size="sm"
              variant="link-destructive"
              class="h-auto px-0 font-semibold"
              :disabled="deletingId === session.id"
              @click="emit('delete', session.id)"
            >
              Delete
            </Button>
          </TableCell>
        </TableRow>
        <TableRow v-if="!pending && sessions.length === 0">
          <TableCell colspan="11" class="h-24 text-center text-muted-foreground">
            No sessions found.
          </TableCell>
        </TableRow>
        <TableRow v-if="pending">
          <TableCell colspan="11" class="h-24 text-center text-muted-foreground">
            Loading sessions…
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
