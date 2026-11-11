<script setup lang="ts">
import CreatedByText from '@/components/CreatedByText.vue'
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
            <TableCell class="align-top font-medium whitespace-normal">{{ row.step }}</TableCell>
            <TableCell class="align-top whitespace-normal">{{ row.role || '—' }}</TableCell>
            <TableCell class="align-top whitespace-normal">
              <CreatedByText v-if="row.actedBy" :actor="row.actedBy" />
              <span v-else>{{ row.actor || '—' }}</span>
            </TableCell>
            <TableCell class="align-top">
              <StatusBadge :status="row.decision" />
            </TableCell>
            <TableCell class="max-w-sm align-top whitespace-normal break-words">
              {{ row.comments?.trim() || '—' }}
            </TableCell>
            <TableCell class="align-top whitespace-nowrap">
              {{ formatInstantForCenter(row.completedAt, center) }}
            </TableCell>
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
