import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'

import { formatMonth } from '@/lib/datetime'
import ToolkitNameCell from '@/features/exercise-management/components/ToolkitNameCell.vue'

import { formatHc, formatSignedPct } from '../reportFormat'
import type { RepositoryRow } from '../types'
import CapacityCell from './CapacityCell.vue'

export type RstRepositoryColumnOptions = {
  onToolkitInfo?: (row: RepositoryRow) => void
}

const columnHelper = createColumnHelper<RepositoryRow>()

export function createRstRepositoryColumns(
  options: RstRepositoryColumnOptions = {},
): ColumnDef<RepositoryRow>[] {
  return [
    columnHelper.accessor('exerciseId', { header: 'Exercise No' }),
    columnHelper.accessor('carrier', { header: 'Carrier' }),
    columnHelper.accessor('site', { header: 'GBS Site' }),
    columnHelper.accessor('country', { header: 'GBS Country' }),
    columnHelper.accessor('domain', { header: 'Domain' }),
    columnHelper.accessor('pl1', { header: 'PL1' }),
    columnHelper.accessor('pl2', { header: 'PL2' }),
    columnHelper.accessor('pl3', { header: 'PL3' }),
    columnHelper.display({
      id: 'toolkit',
      header: 'Toolkit',
      cell: ({ row }) =>
        h(ToolkitNameCell, {
          name: row.original.toolkit || '—',
          canInfo: Boolean(row.original.exerciseUuid && row.original.toolkit),
          onInfo: () => options.onToolkitInfo?.(row.original),
        }),
    }),
    columnHelper.accessor((row) => formatMonth(row.sizingMonth), {
      id: 'sizingMonth',
      header: 'Sizing Month',
    }),
    columnHelper.accessor('kpi', { header: 'Customer Country' }),
    columnHelper.accessor((row) => formatHc(row.deliveryHc), {
      id: 'deliveryHc',
      header: 'Delivery HC',
    }),
    columnHelper.accessor((row) => formatHc(Number(row.rsHc) > 0 ? row.rsHc : null), {
      id: 'rsHc',
      header: 'Right Sizing HC',
    }),
    columnHelper.accessor((row) => formatHc(row.support), {
      id: 'support',
      header: 'Production Support',
    }),
    columnHelper.display({
      id: 'capacityCreation',
      header: 'Capacity Creation',
      cell: ({ row }) => h(CapacityCell, { value: row.original.capacityCreation }),
    }),
    columnHelper.accessor((row) => formatSignedPct(row.capacityPct), {
      id: 'capacityPct',
      header: 'Capacity Creation %',
    }),
    columnHelper.accessor((row) => row.volumeYoY || '—', {
      id: 'volumeYoY',
      header: 'Volume Increase % YoY',
    }),
  ] as ColumnDef<RepositoryRow>[]
}
