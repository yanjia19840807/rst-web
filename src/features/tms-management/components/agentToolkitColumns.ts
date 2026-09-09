import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'

import type { Toolkit } from '../types'
import AgentToolkitRowActions from './AgentToolkitRowActions.vue'

const columnHelper = createColumnHelper<Toolkit>()

export function agentToolkitSubtaskNames(toolkit: Toolkit) {
  return (
    toolkit.subtasks
      .filter((item) => !item.deletedAt && item.enabled !== false)
      .map((item) => item.name)
      .join('; ') || '—'
  )
}

export function createAgentToolkitColumns(
  onView: (id: string) => void,
): ColumnDef<Toolkit>[] {
  return [
    columnHelper.accessor('name', {
      header: 'Toolkit Name',
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
    columnHelper.accessor((row) => agentToolkitSubtaskNames(row), {
      id: 'subtasks',
      header: 'Subtasks',
    }),
    columnHelper.accessor((row) => (row.enabled === false ? 'Disabled' : 'Enabled'), {
      id: 'enabled',
      header: 'Status',
      meta: { headerClass: 'min-w-[5.75rem]', cellClass: 'min-w-[5.75rem]' },
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      header: () => h('div', { class: 'text-right' }, 'Action'),
      cell: ({ row }) =>
        h(AgentToolkitRowActions, {
          onOpen: () => onView(row.original.id),
        }),
      meta: { headerClass: 'min-w-[4.5rem] text-right', cellClass: 'min-w-[4.5rem] text-right' },
    }),
  ] as ColumnDef<Toolkit>[]
}
