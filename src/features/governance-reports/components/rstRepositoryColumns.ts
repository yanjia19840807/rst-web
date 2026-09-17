import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'

import { formatCivilDateTime, formatMonth } from '@/lib/datetime'
import ToolkitNameCell from '@/features/exercise-management/components/ToolkitNameCell.vue'
import { FieldUnit, withUnit } from '@/features/exercise-management/fieldUnits'

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
    columnHelper.accessor((row) => formatCivilDateTime(row.validatedDate), {
      id: 'validatedDate',
      header: 'Validated Date',
    }),
    columnHelper.accessor('country', { header: 'GBS Center' }),
    columnHelper.accessor('kpi', { header: 'Customer Country' }),
    columnHelper.accessor('carrier', { header: 'Carrier' }),
    columnHelper.accessor('site', { header: 'GBS Site' }),
    columnHelper.accessor('domain', { header: 'Domain' }),
    columnHelper.accessor('pl3', { header: 'PL3' }),
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
      header: withUnit('Production Support', FieldUnit.fte),
    }),
    columnHelper.display({
      id: 'capacityCreation',
      header: withUnit('Capacity Creation', FieldUnit.hc),
      cell: ({ row }) => h(CapacityCell, { value: row.original.capacityCreation }),
    }),
    columnHelper.accessor((row) => formatSignedPct(row.capacityPct), {
      id: 'capacityPct',
      header: withUnit('Capacity Creation', FieldUnit.percent),
    }),
    columnHelper.accessor((row) => row.volumeYoY || '—', {
      id: 'volumeYoY',
      header: withUnit('Volume Increase YoY', FieldUnit.percent),
    }),
  ] as ColumnDef<RepositoryRow>[]
}
