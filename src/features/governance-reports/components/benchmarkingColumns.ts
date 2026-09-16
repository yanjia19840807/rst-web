import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'

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
    columnHelper.accessor((row) => formatSeconds(row.cycleTimeSeconds), {
      id: 'cycleTime',
      header: 'Cycle time',
    }),
    columnHelper.accessor((row) => formatCapacity(row.dailyCapacityPerAgent), {
      id: 'dailyCapacity',
      header: 'Daily Production Capacity / Agent',
    }),
    columnHelper.accessor((row) => formatPct(row.productionSupportRatioPct), {
      id: 'supportRatio',
      header: 'Production Support Ratio',
    }),
    columnHelper.display({
      id: 'capacityCreation',
      header: 'Capacity Creation',
      cell: ({ row }) => h(CapacityCell, { value: row.original.capacityCreation }),
    }),
  ] as ColumnDef<BenchmarkRow>[]
}
