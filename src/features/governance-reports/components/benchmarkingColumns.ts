import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'

import { FieldUnit, withUnit } from '@/features/exercise-management/fieldUnits'
import { formatMonth } from '@/lib/datetime'

import { formatCapacity, formatPct, formatSeconds } from '../reportFormat'
import type { BenchmarkRow } from '../types'
import CapacityCell from './CapacityCell.vue'

const columnHelper = createColumnHelper<BenchmarkRow>()

export function createBenchmarkingColumns(): ColumnDef<BenchmarkRow>[] {
  return [
    columnHelper.accessor('gbs', { header: 'GBS Center' }),
    columnHelper.accessor('carrier', { header: 'Carrier' }),
    columnHelper.accessor('site', { header: 'GBS Site' }),
    columnHelper.accessor('sharedKpiLine', { header: 'Customer country' }),
    columnHelper.accessor('domain', { header: 'Domain' }),
    columnHelper.accessor('pl3', { header: 'PL3' }),
    columnHelper.accessor((row) => formatMonth(row.sizingMonth), {
      id: 'sizingMonth',
      header: 'Sizing Month',
    }),
    columnHelper.accessor((row) => formatSeconds(row.cycleTimeSeconds), {
      id: 'cycleTime',
      header: withUnit('Cycle time', FieldUnit.seconds),
    }),
    columnHelper.accessor((row) => formatCapacity(row.dailyCapacityPerAgent), {
      id: 'dailyCapacity',
      header: withUnit('Daily Production Capacity / Agent', FieldUnit.transactions),
    }),
    columnHelper.accessor((row) => formatPct(row.productionSupportRatioPct), {
      id: 'supportRatio',
      header: withUnit('Production Support Ratio', FieldUnit.percent),
    }),
    columnHelper.display({
      id: 'capacityCreation',
      header: withUnit('Capacity Creation', FieldUnit.hc),
      cell: ({ row }) => h(CapacityCell, { value: row.original.capacityCreation }),
    }),
  ] as ColumnDef<BenchmarkRow>[]
}
