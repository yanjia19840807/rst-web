<script setup lang="ts">
import { computed } from 'vue'

import ListLoading from '@/components/ListLoading.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useTimesheetSyncRunQuery } from '../api/queries'
import type { TimesheetSyncIssue, TimesheetSyncRunHeader } from '../types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  runId: string | null
  run?: TimesheetSyncRunHeader | null
}>()

const detailQuery = useTimesheetSyncRunQuery(() => (open.value ? props.runId : null))

const issues = computed<TimesheetSyncIssue[]>(() => {
  const rows = detailQuery.data.value?.issues ?? []
  if (rows.length) return rows
  const header = detailQuery.data.value?.run ?? props.run
  if (!header?.errorCode && !header?.errorMessage) return []
  return [
    {
      id: `${header.id}-run-error`,
      code: header.errorCode || 'FAILED',
      message: header.errorMessage || 'Timesheet sync failed.',
      empCcgid: null,
      positionId: null,
      pl3Code: null,
      sourceRow: null,
    },
  ]
})

const fileName = computed(
  () => detailQuery.data.value?.run.sourceFileName || props.run?.sourceFileName || '',
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
      <DialogHeader class="mx-0 mt-0 shrink-0 rounded-none px-6 py-4">
        <DialogTitle>Run issues</DialogTitle>
        <DialogDescription>
          Errors that blocked this run from becoming ACTIVE.
          <template v-if="fileName"> {{ fileName }}</template>
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <ListLoading v-if="detailQuery.isPending.value" />
        <p
          v-else-if="detailQuery.isError.value"
          class="text-sm text-destructive"
        >
          {{
            detailQuery.error.value instanceof Error
              ? detailQuery.error.value.message
              : 'Could not load run issues.'
          }}
        </p>
        <p v-else-if="!issues.length" class="text-sm text-muted-foreground">
          No issues on this run.
        </p>
        <div v-else class="min-w-0 overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Error Message</TableHead>
                <TableHead>CCGID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="issue in issues" :key="issue.id">
                <TableCell>{{ issue.sourceRow ?? '—' }}</TableCell>
                <TableCell>{{ issue.message }}</TableCell>
                <TableCell>{{ issue.empCcgid || '—' }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <DialogFooter class="mx-0 mt-0 mb-0 shrink-0 rounded-none px-5 py-3">
        <Button type="button" variant="outline" @click="open = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
