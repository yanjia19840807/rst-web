import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'
import { hasDistinctActor, viaLabel } from '@/lib/auditActor'
import { formatInstantForCenter } from '@/lib/datetime'

import type { TmsSession } from '../types'
import PausedSessionRowActions from './PausedSessionRowActions.vue'

export type PausedSessionColumnOptions = {
  hasRunningSession?: boolean
  resumePending?: boolean
  discardPending?: boolean
  onResume?: (id: string) => void
  onDiscard?: (id: string) => void
}

const columnHelper = createColumnHelper<TmsSession>()

export function createPausedSessionColumns(
  options: PausedSessionColumnOptions = {},
): ColumnDef<TmsSession>[] {
  return [
    columnHelper.accessor('id', {
      header: 'Session No',
      cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.id),
    }),
    columnHelper.display({
      id: 'createdBy',
      header: 'Created by',
      cell: ({ row }) =>
        h('div', { class: 'grid gap-0.5' }, [
          h('span', row.original.agentName || '—'),
          hasDistinctActor(row.original.createdBy)
            ? h('span', { class: 'text-xs text-muted-foreground' }, viaLabel(row.original.createdBy))
            : null,
        ]),
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.startedAt, row.center), {
      id: 'startedAt',
      header: 'Start',
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.pausedAt, row.center), {
      id: 'pausedAt',
      header: 'Pause',
    }),
    columnHelper.accessor((row) => row.reference || '—', {
      id: 'reference',
      header: 'Reference',
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      header: () => h('div', { class: 'text-right' }, 'Action'),
      cell: ({ row }) =>
        h(PausedSessionRowActions, {
          resumeDisabled: options.resumePending,
          discardDisabled: options.discardPending,
          onResume: () => options.onResume?.(row.original.id),
          onDiscard: () => options.onDiscard?.(row.original.id),
        }),
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
    }),
  ] as ColumnDef<TmsSession>[]
}
