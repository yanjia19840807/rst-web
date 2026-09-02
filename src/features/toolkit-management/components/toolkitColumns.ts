import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'
import ScopeChangedBadge from '@/features/timesheet-alignment/components/ScopeChangedBadge.vue'

import type { SupervisorToolkit } from '../types'
import ToolkitRowActions from './ToolkitRowActions.vue'

export type ToolkitColumnOptions = {
  exportingId?: string | null
  onCreate?: (toolkit: SupervisorToolkit) => void
  onEdit?: (id: string) => void
  onExport?: (toolkit: SupervisorToolkit) => void
}

const columnHelper = createColumnHelper<SupervisorToolkit>()

export function activeSubtaskNames(toolkit: SupervisorToolkit) {
  return (
    toolkit.subtasks
      .filter((item) => !item.deletedAt)
      .map((item) => item.name)
      .join('; ') || '—'
  )
}

export function createToolkitColumns(
  options: ToolkitColumnOptions = {},
): ColumnDef<SupervisorToolkit>[] {
  return [
    columnHelper.accessor('name', {
      header: 'Toolkit Name',
      cell: ({ row }) =>
        h('span', { class: 'inline-flex flex-wrap items-center gap-1.5' }, [
          h('span', row.original.name),
          row.original.outOfSync ? h(ScopeChangedBadge) : null,
        ]),
    }),
    columnHelper.accessor('center', {
      header: 'GBS Center',
    }),
    columnHelper.accessor('domain', {
      header: 'Domain',
    }),
    columnHelper.accessor('pl1', {
      header: 'Process Level 1',
    }),
    columnHelper.accessor('pl2', {
      header: 'Process Level 2',
    }),
    columnHelper.accessor('pl3Name', {
      header: 'Process Level 3',
    }),
    columnHelper.accessor((row) => activeSubtaskNames(row), {
      id: 'subtasks',
      header: 'Subtasks',
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      header: () => h('div', { class: 'text-right' }, 'Action'),
      cell: ({ row }) =>
        h('div', { class: 'relative' }, [
          h(ToolkitRowActions, {
            exporting: options.exportingId === row.original.id,
            exportDisabled: Boolean(options.exportingId),
            createDisabled: Boolean(row.original.outOfSync),
            onCreate: () => options.onCreate?.(row.original),
            onEdit: () => options.onEdit?.(row.original.id),
            onExport: () => options.onExport?.(row.original),
          }),
        ]),
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
    }),
  ] as ColumnDef<SupervisorToolkit>[]
}
