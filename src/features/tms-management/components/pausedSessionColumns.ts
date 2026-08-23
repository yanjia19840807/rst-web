import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'
import { formatDateTime } from '@/lib/datetime'

import type { TmsSession } from '../types'
import PausedSessionRowActions from './PausedSessionRowActions.vue'

export type PausedSessionColumnOptions = {
  hasRunningSession?: boolean
  resumePending?: boolean
  deletePending?: boolean
  onResume?: (id: string) => void
  onDelete?: (id: string) => void
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
    columnHelper.accessor((row) => formatDateTime(row.pausedAt), {
      id: 'pausedAt',
      header: 'Pause Time',
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
        h('div', { class: 'relative' }, [
          h(PausedSessionRowActions, {
            resumeDisabled: options.hasRunningSession || options.resumePending,
            deleteDisabled: options.deletePending,
            onResume: () => options.onResume?.(row.original.id),
            onDelete: () => options.onDelete?.(row.original.id),
          }),
        ]),
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
    }),
  ] as ColumnDef<TmsSession>[]
}
