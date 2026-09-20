import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import StatusBadge from '@/components/StatusBadge.vue'
import '@/components/ui/data-table/types'
import ToolkitNameCell from '@/features/exercise-management/components/ToolkitNameCell.vue'
import ScopeChangedBadge from '@/features/timesheet-alignment/components/ScopeChangedBadge.vue'
import { joinCommaTokens } from '@/lib/commaTokens'

import type { SupervisorToolkit } from '../types'
import ToolkitRowActions from './ToolkitRowActions.vue'

export type ToolkitColumnOptions = {
  exportingId?: string | null
  onCreate?: (toolkit: SupervisorToolkit) => void
  onEdit?: (id: string) => void
  onExport?: (toolkit: SupervisorToolkit) => void
  onToolkitInfo?: (toolkit: SupervisorToolkit) => void
}

const columnHelper = createColumnHelper<SupervisorToolkit>()

export function activeSubtaskNames(toolkit: SupervisorToolkit) {
  return (
    toolkit.subtasks
      .filter((item) => !item.deletedAt && item.enabled !== false)
      .map((item) => item.name)
      .join('; ') || '—'
  )
}

function distinctValues(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const token = value?.trim()
    if (token && !seen.has(token)) {
      seen.add(token)
      out.push(token)
    }
  }
  return out
}

function joined(values: string[]) {
  return values.join(', ') || '—'
}

export function createToolkitColumns(
  options: ToolkitColumnOptions = {},
): ColumnDef<SupervisorToolkit>[] {
  return [
    columnHelper.display({
      id: 'name',
      header: 'Toolkit',
      cell: ({ row }) =>
        h('span', { class: 'inline-flex flex-wrap items-center gap-1.5' }, [
          h(ToolkitNameCell, {
            name: row.original.name || '—',
            canInfo: Boolean(row.original.id && row.original.name),
            onInfo: () => options.onToolkitInfo?.(row.original),
          }),
          row.original.outOfSync ? h(ScopeChangedBadge) : null,
        ]),
    }),
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
    columnHelper.accessor((row) => row.pl3Name || '—', {
      id: 'pl3',
      header: 'PL3',
    }),
    columnHelper.accessor(
      (row) => joined(distinctValues((row.sharedKpiSelections ?? []).map((item) => item.carrier))),
      {
        id: 'carriers',
        header: 'Carrier',
      },
    ),
    columnHelper.accessor(
      (row) => joined(distinctValues((row.sharedKpiSelections ?? []).map((item) => item.site))),
      {
        id: 'sites',
        header: 'GBS Site',
      },
    ),
    columnHelper.accessor(
      (row) => joinCommaTokens((row.sharedKpiSelections ?? []).map((item) => item.customerCountry)) || '—',
      {
        id: 'customerCountries',
        header: 'Customer Country',
      },
    ),
    columnHelper.accessor((row) => (row.combineSubtasksTime ? 'Yes' : 'No'), {
      id: 'combineSubtasksTime',
      header: 'Combine Subtask Time',
    }),
    columnHelper.accessor((row) => activeSubtaskNames(row), {
      id: 'subtasks',
      header: 'Subtasks',
      meta: { cellClass: 'max-w-64 truncate' },
    }),
    columnHelper.accessor((row) => (row.enabled === false ? 'Disabled' : 'Enabled'), {
      id: 'enabled',
      header: 'Status',
      meta: { headerClass: 'min-w-[5.75rem]', cellClass: 'min-w-[5.75rem]' },
      cell: ({ row }) =>
        h(StatusBadge, { status: row.original.enabled === false ? 'Disabled' : 'Enabled' }),
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      header: () => h('div', { class: 'text-right' }, 'Action'),
      cell: ({ row }) =>
        h(ToolkitRowActions, {
          exporting: options.exportingId === row.original.id,
          exportDisabled: Boolean(options.exportingId),
          createDisabled: Boolean(row.original.outOfSync) || row.original.enabled === false,
          onCreate: () => options.onCreate?.(row.original),
          onEdit: () => options.onEdit?.(row.original.id),
          onExport: () => options.onExport?.(row.original),
        }),
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
    }),
  ] as ColumnDef<SupervisorToolkit>[]
}
