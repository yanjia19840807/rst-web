<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/datetime'

import type { ApprovalHistoryRow } from '../types'

defineProps<{
  rows?: ApprovalHistoryRow[] | null
  emptyMessage?: string
}>()

function decisionTone(decision?: string | null) {
  if (decision === 'Returned' || decision === 'Withdrawn') return 'bad' as const
  if (decision === 'Approved') return 'good' as const
  return 'muted' as const
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border">
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
        <TableRow
          v-for="row in rows ?? []"
          :key="row.actionId"
          :class="row.mine ? 'bg-primary/5' : undefined"
        >
          <TableCell class="font-medium">{{ row.step }}</TableCell>
          <TableCell>{{ row.role || '—' }}</TableCell>
          <TableCell>{{ row.actor || '—' }}</TableCell>
          <TableCell>
            <Badge
              :variant="decisionTone(row.decision) === 'bad' ? 'destructive' : 'outline'"
              :class="{
                'border-emerald-200 bg-emerald-50 text-emerald-700':
                  decisionTone(row.decision) === 'good',
              }"
            >
              {{ row.decision }}
            </Badge>
          </TableCell>
          <TableCell class="max-w-xs wrap-break-word">{{ row.comments?.trim() || '—' }}</TableCell>
          <TableCell>{{ formatDateTime(row.completedAt) }}</TableCell>
        </TableRow>
        <TableRow v-if="!(rows ?? []).length">
          <TableCell colspan="6" class="h-24 text-center text-muted-foreground">
            {{ emptyMessage || 'No approval history yet.' }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
