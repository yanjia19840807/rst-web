import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import '@/components/ui/data-table/types'
import { formatDateTimeSeconds } from '@/lib/datetime'

import type { TimesheetSyncRunHeader } from '../types'

export type TimesheetActiveRow = {
  kind: 'DAILY' | 'MONTHLY'
  run: TimesheetSyncRunHeader | null
}

export type TimesheetSyncColumnOptions = {
  onViewIssues?: (row: TimesheetSyncRunHeader) => void
}

const activeHelper = createColumnHelper<TimesheetActiveRow>()
const runHelper = createColumnHelper<TimesheetSyncRunHeader>()

function dash(value: string | number | null | undefined) {
  if (value == null || value === '') return '—'
  return String(value)
}

function statusBadge(status: string | null | undefined) {
  if (!status) return '—'
  const variant =
    status === 'ACTIVE' ? 'secondary' : status === 'FAILED' ? 'destructive' : 'outline'
  return h(Badge, { variant }, () => status)
}

function viewIssuesButton(row: TimesheetSyncRunHeader | null, onViewIssues?: (row: TimesheetSyncRunHeader) => void) {
  if (!row) return '—'
  return h(
    Button,
    {
      size: 'sm',
      variant: 'link',
      class: 'h-auto px-0 font-semibold',
      onClick: () => onViewIssues?.(row),
    },
    () => 'View issues',
  )
}

export function createTimesheetActiveColumns(): ColumnDef<TimesheetActiveRow>[] {
  return [
    activeHelper.accessor('kind', {
      header: 'Kind',
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.kind),
    }),
    activeHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => statusBadge(row.original.run?.status),
    }),
    activeHelper.display({
      id: 'syncDate',
      header: 'Date',
      cell: ({ row }) => dash(row.original.run?.syncDate),
    }),
    activeHelper.display({
      id: 'sourceType',
      header: 'Source',
      cell: ({ row }) => dash(row.original.run?.sourceType),
    }),
    activeHelper.display({
      id: 'sourceFileName',
      header: 'File',
      cell: ({ row }) => dash(row.original.run?.sourceFileName),
    }),
    activeHelper.display({
      id: 'rowCount',
      header: 'Rows',
      cell: ({ row }) => dash(row.original.run?.rowCount),
    }),
    activeHelper.display({
      id: 'triggeredByCcgid',
      header: 'Triggered by',
      cell: ({ row }) => dash(row.original.run?.triggeredByCcgid),
    }),
  ]
}

export function createTimesheetRunColumns(
  options: TimesheetSyncColumnOptions = {},
): ColumnDef<TimesheetSyncRunHeader>[] {
  return [
    runHelper.accessor('kind', {
      header: 'Kind',
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.kind),
    }),
    runHelper.accessor('status', {
      header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    }),
    runHelper.accessor('syncDate', {
      header: 'Date',
    }),
    runHelper.accessor((row) => row.sourceFileName || '—', {
      id: 'sourceFileName',
      header: 'File',
    }),
    runHelper.accessor((row) => row.errorCode || '—', {
      id: 'errorCode',
      header: 'Error Code',
    }),
    runHelper.accessor((row) => formatDateTimeSeconds(row.startedAt), {
      id: 'startedAt',
      header: 'Started',
    }),
    runHelper.display({
      id: 'actions',
      header: 'Action',
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
      cell: ({ row }) => viewIssuesButton(row.original, options.onViewIssues),
    }),
  ]
}
