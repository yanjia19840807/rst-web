import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import '@/components/ui/data-table/types'
import { formatDateTimeSeconds } from '@/lib/datetime'

import type { TimesheetSnapshotTab, TimesheetSyncRunHeader } from '../types'

export type TimesheetActiveRow = {
  kind: 'DAILY' | 'MONTHLY'
  run: TimesheetSyncRunHeader | null
}

export type TimesheetActiveColumnOptions = {
  onViewTables?: (row: TimesheetActiveRow, tab: TimesheetSnapshotTab) => void
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

function mappedTableLinks(
  row: TimesheetActiveRow,
  onViewTables?: (row: TimesheetActiveRow, tab: TimesheetSnapshotTab) => void,
) {
  if (!row.run) return '—'
  const tabs =
    row.kind === 'DAILY'
      ? ([
          { key: 'people', label: 'People' },
          { key: 'positions', label: 'Positions' },
        ] as const)
      : ([
          { key: 'scopes', label: 'Process' },
          { key: 'kpis', label: 'Delivery HC' },
        ] as const)
  return h(
    'div',
    { class: 'flex flex-wrap justify-end gap-x-3' },
    tabs.map((tab) =>
      h(
        Button,
        {
          size: 'sm',
          variant: 'link',
          class: 'h-auto px-0 font-semibold',
          onClick: () => onViewTables?.(row, tab.key),
        },
        () => tab.label,
      ),
    ),
  )
}

export function createTimesheetActiveColumns(
  options: TimesheetActiveColumnOptions = {},
): ColumnDef<TimesheetActiveRow>[] {
  return [
    activeHelper.display({
      id: 'center',
      header: 'Center',
      cell: ({ row }) => dash(row.original.run?.center),
    }),
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
    activeHelper.display({
      id: 'mappedTables',
      header: 'Mapped tables',
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
      cell: ({ row }) => mappedTableLinks(row.original, options.onViewTables),
    }),
  ]
}

export function createTimesheetRunColumns(
  options: TimesheetSyncColumnOptions = {},
): ColumnDef<TimesheetSyncRunHeader>[] {
  return [
    runHelper.accessor((row) => dash(row.center), {
      id: 'center',
      header: 'Center',
    }),
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
