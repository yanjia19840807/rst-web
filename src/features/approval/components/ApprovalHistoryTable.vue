<script setup lang="ts">
import ListLoading from '@/components/ListLoading.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatInstantForCenter } from '@/lib/datetime'

import type { ApprovalHistoryRow } from '../types'

defineProps<{
  rows?: ApprovalHistoryRow[] | null
  emptyMessage?: string
  pending?: boolean
  center?: string | null
}>()

</script>

<template>
  <div class="w-0 min-w-full overflow-x-auto rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Step</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Decision</TableHead>
          <TableHead>Comments</TableHead>
          <TableHead>Completed on</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="pending && !(rows ?? []).length">
          <TableCell colspan="6" class="p-0">
            <ListLoading />
          </TableCell>
        </TableRow>
        <template v-else>
          <TableRow
            v-for="row in rows ?? []"
            :key="row.actionId"
            :class="row.mine ? 'bg-primary/5' : undefined"
          >
            <TableCell class="font-medium">{{ row.step }}</TableCell>
            <TableCell>{{ row.role || '—' }}</TableCell>
            <TableCell>{{ row.actor || '—' }}</TableCell>
            <TableCell>
              <StatusBadge :status="row.decision" />
            </TableCell>
            <TableCell class="max-w-xs wrap-break-word">{{ row.comments?.trim() || '—' }}</TableCell>
            <TableCell>{{ formatInstantForCenter(row.completedAt, center) }}</TableCell>
          </TableRow>
          <TableRow v-if="!(rows ?? []).length">
            <TableCell colspan="6" class="h-24 text-center text-muted-foreground">
              {{ emptyMessage || 'No approval history yet.' }}
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
