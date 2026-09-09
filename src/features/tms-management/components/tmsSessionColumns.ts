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
  enabled?: boolean
}

export type TmsSessionColumnOptions = {
  showActions?: boolean
  showStatus?: boolean
  canToggleEnabled?: boolean
  togglingId?: string
  cycleTimeHeader?: string
  cycleTimeWithUnit?: boolean
  onOpen?: (id: string) => void
  onToggleEnabled?: (id: string) => void
}

const columnHelper = createColumnHelper<TmsSessionTableRow>()

export function formatSessionVolume(processedVolume: number | null | undefined) {
  if (processedVolume == null) return '—'
  const volume = Number(processedVolume)
  return Number.isFinite(volume) ? String(volume) : '—'
}

export function cycleTimeVolume(processedVolume: number | null | undefined) {
  const volume = Number(processedVolume)
  return Number.isFinite(volume) && volume > 0 ? volume : null
}

export function cycleTime(row: TmsSessionTableRow, withUnit = true) {
  const suffix = withUnit ? 's' : ''
  if (row.cycleTimeSeconds != null) return `${row.cycleTimeSeconds}${suffix}`
  const volume = cycleTimeVolume(row.processedVolume)
  if (volume == null) return '—'
  return `${Math.round(row.netDurationSeconds / volume)}${suffix}`
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
      formatSessionVolume(row.processedVolume),
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
  if (options.showStatus) {
    columns.push(
      columnHelper.accessor((row) => (row.enabled === false ? 'Disabled' : 'Enabled'), {
        id: 'enabled',
        header: 'Status',
        meta: { headerClass: 'min-w-[5.75rem]', cellClass: 'min-w-[5.75rem]' },
      }),
    )
  }

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
            canToggleEnabled: options.canToggleEnabled,
            enabled: row.original.enabled !== false,
            toggling: options.togglingId === row.original.id,
            onOpen: () => options.onOpen?.(row.original.id),
            onToggleEnabled: () => options.onToggleEnabled?.(row.original.id),
          }),
        ]),
      meta: { headerClass: 'min-w-[4.5rem] text-right', cellClass: 'min-w-[4.5rem] text-right' },
    }),
  ] as ColumnDef<TmsSessionTableRow>[]
}
