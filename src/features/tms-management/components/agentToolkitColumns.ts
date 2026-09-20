import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import StatusBadge from '@/components/StatusBadge.vue'
import '@/components/ui/data-table/types'
import ToolkitNameCell from '@/features/exercise-management/components/ToolkitNameCell.vue'
import { joinCommaTokens } from '@/lib/commaTokens'

import type { Toolkit } from '../types'

const columnHelper = createColumnHelper<Toolkit>()

export function agentToolkitSubtaskNames(toolkit: Toolkit) {
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

export function createAgentToolkitColumns(
  onView: (id: string) => void,
): ColumnDef<Toolkit>[] {
  return [
    columnHelper.display({
      id: 'name',
      header: 'Toolkit',
      cell: ({ row }) =>
        h(ToolkitNameCell, {
          name: row.original.name || '—',
          canInfo: Boolean(row.original.id && row.original.name),
          onInfo: () => onView(row.original.id),
        }),
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
    columnHelper.accessor((row) => joined(distinctValues((row.sharedKpiSelections ?? []).map((item) => item.carrier))), {
      id: 'carriers',
      header: 'Carrier',
    }),
    columnHelper.accessor((row) => joined(distinctValues((row.sharedKpiSelections ?? []).map((item) => item.site))), {
      id: 'sites',
      header: 'GBS Site',
    }),
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
    columnHelper.accessor((row) => agentToolkitSubtaskNames(row), {
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
  ] as ColumnDef<Toolkit>[]
}
