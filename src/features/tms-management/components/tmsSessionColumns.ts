import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import StatusBadge from '@/components/StatusBadge.vue'
import '@/components/ui/data-table/types'
import ToolkitNameCell from '@/features/exercise-management/components/ToolkitNameCell.vue'
import { hasDistinctActor, viaLabel, type AuditActor } from '@/lib/auditActor'
import { joinCommaTokens } from '@/lib/commaTokens'
import { formatInstantForCenter } from '@/lib/datetime'

import { formatDuration } from '../composables/useTmsTimer'
import TmsSessionRowActions from './TmsSessionRowActions.vue'

export type TmsSessionTableRow = {
  id: string
  toolkitId?: string | null
  agentName?: string | null
  createdBy?: AuditActor | null
  toolkitName?: string | null
  subtaskName?: string | null
  startedAt: string
  endedAt?: string | null
  center?: string | null
  domain?: string | null
  pl1?: string | null
  pl2?: string | null
  pl3?: string | null
  carriers?: string[]
  sites?: string[]
  customerCountries?: string[]
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
  showToolkitScope?: boolean
  canToggleEnabled?: boolean
  togglingId?: string
  cycleTimeHeader?: string
  cycleTimeWithUnit?: boolean
  onOpen?: (id: string) => void
  onToggleEnabled?: (id: string) => void
  onToolkitInfo?: (row: TmsSessionTableRow) => void
}

function joined(values: string[] | null | undefined) {
  const text = values?.filter((item) => item.trim()).join(', ')
  return text || '—'
}

function joinedCountries(values: string[] | null | undefined) {
  return joinCommaTokens(values) || '—'
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
    columnHelper.display({
      id: 'agent',
      header: 'Created by',
      cell: ({ row }) =>
        h('div', { class: 'grid gap-0.5' }, [
          h('span', row.original.agentName || '—'),
          hasDistinctActor(row.original.createdBy)
            ? h('span', { class: 'text-xs text-muted-foreground' }, viaLabel(row.original.createdBy))
            : null,
        ]),
    }),
    columnHelper.display({
      id: 'toolkitName',
      header: 'Toolkit',
      cell: ({ row }) =>
        h(ToolkitNameCell, {
          name: row.original.toolkitName || '—',
          canInfo: Boolean(options.onToolkitInfo && row.original.toolkitId && row.original.toolkitName),
          onInfo: () => options.onToolkitInfo?.(row.original),
        }),
    }),
  ]
  if (options.showToolkitScope) {
    columns.push(
      columnHelper.accessor((row) => row.center || '—', {
        id: 'center',
        header: 'GBS Center',
      }),
      columnHelper.accessor((row) => row.domain || '—', {
        id: 'domain',
        header: 'Domain',
      }),
      columnHelper.accessor((row) => row.pl1 || '—', {
        id: 'pl1',
        header: 'PL1',
      }),
      columnHelper.accessor((row) => row.pl2 || '—', {
        id: 'pl2',
        header: 'PL2',
      }),
      columnHelper.accessor((row) => row.pl3 || '—', {
        id: 'pl3',
        header: 'PL3',
      }),
      columnHelper.accessor((row) => joined(row.carriers), {
        id: 'carriers',
        header: 'Carrier',
      }),
      columnHelper.accessor((row) => joined(row.sites), {
        id: 'sites',
        header: 'GBS Site',
      }),
      columnHelper.accessor((row) => joinedCountries(row.customerCountries), {
        id: 'customerCountries',
        header: 'Customer Country',
      }),
    )
  }
  columns.push(
    columnHelper.accessor((row) => row.subtaskName || '—', {
      id: 'subtaskName',
      header: 'Subtask',
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.startedAt, row.center), {
      id: 'startedAt',
      header: 'Start',
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.endedAt, row.center), {
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
  )
  if (options.showStatus) {
    columns.push(
      columnHelper.accessor((row) => (row.enabled === false ? 'Disabled' : 'Enabled'), {
        id: 'enabled',
        header: 'Status',
        meta: { headerClass: 'min-w-[5.75rem]', cellClass: 'min-w-[5.75rem]' },
        cell: ({ row }) =>
          h(StatusBadge, { status: row.original.enabled === false ? 'Disabled' : 'Enabled' }),
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
        h(TmsSessionRowActions, {
          canToggleEnabled: options.canToggleEnabled,
          enabled: row.original.enabled !== false,
          toggling: options.togglingId === row.original.id,
          onOpen: () => options.onOpen?.(row.original.id),
          onToggleEnabled: () => options.onToggleEnabled?.(row.original.id),
        }),
      meta: { headerClass: 'min-w-[4.5rem] text-right', cellClass: 'min-w-[4.5rem] text-right' },
    }),
  ] as ColumnDef<TmsSessionTableRow>[]
}
