import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'
import { formatDateTime } from '@/lib/datetime'

import { formatDuration } from '../composables/useTmsTimer'
import TmsSessionRowActions from './TmsSessionRowActions.vue'

export type TmsSessionTableRow = {
  id: string
  agentName?: string | null
  toolkitName?: string | null
  subtaskName?: string | null
  startedAt: string
  endedAt?: string | null
  netDurationSeconds: number
  processedVolume: number | null
  reference?: string | null
  remarks?: string | null
  cycleTimeSeconds?: number | null
}

export type TmsSessionColumnOptions = {
  showActions?: boolean
  canDelete?: boolean
  deletingId?: string
  cycleTimeHeader?: string
  cycleTimeWithUnit?: boolean
  onOpen?: (id: string) => void
  onDelete?: (id: string) => void
}

const columnHelper = createColumnHelper<TmsSessionTableRow>()

export function cycleTimeVolume(processedVolume: number | null | undefined) {
  const volume = Number(processedVolume)
  return Number.isFinite(volume) && volume > 0 ? volume : 1
}

export function cycleTime(row: TmsSessionTableRow, withUnit = true) {
  const suffix = withUnit ? 's' : ''
  if (row.cycleTimeSeconds != null) return `${row.cycleTimeSeconds}${suffix}`
  return `${Math.round(row.netDurationSeconds / cycleTimeVolume(row.processedVolume))}${suffix}`
}

export function createTmsSessionColumns(
  options: TmsSessionColumnOptions = {},
): ColumnDef<TmsSessionTableRow>[] {
  const columns = [
    columnHelper.accessor('id', {
      header: 'Session No',
      cell: ({ row }) => h('span', { class: 'font-mono' }, row.original.id),
    }),
    columnHelper.accessor((row) => row.agentName || '—', {
      id: 'agent',
      header: 'Agent',
    }),
    columnHelper.accessor((row) => row.toolkitName || '—', {
      id: 'toolkitName',
      header: 'Toolkit',
    }),
    columnHelper.accessor((row) => row.subtaskName || '—', {
      id: 'subtaskName',
      header: 'Subtask',
    }),
    columnHelper.accessor((row) => formatDateTime(row.startedAt), {
      id: 'startedAt',
      header: 'Start',
    }),
    columnHelper.accessor((row) => formatDateTime(row.endedAt), {
      id: 'endedAt',
      header: 'End',
    }),
    columnHelper.accessor((row) => formatDuration(row.netDurationSeconds), {
      id: 'duration',
      header: 'Duration',
    }),
    columnHelper.accessor((row) => cycleTime(row, options.cycleTimeWithUnit ?? true), {
      id: 'cycleTime',
      header: options.cycleTimeHeader ?? 'Cycle Time',
    }),
    columnHelper.accessor((row) => row.reference || '—', {
      id: 'reference',
      header: 'Reference',
    }),
    columnHelper.accessor((row) =>
      row.processedVolume == null ? '—' : Number(row.processedVolume).toFixed(2),
    {
      id: 'volume',
      header: 'Volume',
    }),
    columnHelper.accessor((row) => row.remarks || '—', {
      id: 'remarks',
      header: 'Remarks',
      meta: { cellClass: 'max-w-52 truncate' },
    }),
  ]

  if (options.showActions === false) {
    return columns as ColumnDef<TmsSessionTableRow>[]
  }

  return [
    ...columns,
    columnHelper.display({
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Action'),
      enableHiding: false,
      cell: ({ row }) =>
        h('div', { class: 'relative' }, [
          h(TmsSessionRowActions, {
            canDelete: options.canDelete,
            deleting: options.deletingId === row.original.id,
            onOpen: () => options.onOpen?.(row.original.id),
            onDelete: () => options.onDelete?.(row.original.id),
          }),
        ]),
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
    }),
  ] as ColumnDef<TmsSessionTableRow>[]
}
