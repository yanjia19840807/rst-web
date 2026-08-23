import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import { Badge } from '@/components/ui/badge'
import '@/components/ui/data-table/types'

import { displayOrDash, formatSignedPct } from '../reportFormat'
import type { ValidationWorkflowRow } from '../types'
import CapacityCell from './CapacityCell.vue'

const columnHelper = createColumnHelper<ValidationWorkflowRow>()

export function createValidationWorkflowColumns(): ColumnDef<ValidationWorkflowRow>[] {
  return [
    columnHelper.accessor('exerciseNo', { header: 'Exercise No' }),
    columnHelper.accessor((row) => displayOrDash(row.gbs), { id: 'gbs', header: 'GBS' }),
    columnHelper.accessor((row) => displayOrDash(row.domain), { id: 'domain', header: 'Domain' }),
    columnHelper.accessor((row) => displayOrDash(row.pl3), { id: 'pl3', header: 'PL3' }),
    columnHelper.accessor((row) => displayOrDash(row.toolkit), { id: 'toolkit', header: 'Toolkit' }),
    columnHelper.accessor((row) => displayOrDash(row.currentStep), {
      id: 'currentStep',
      header: 'Current step',
    }),
    columnHelper.accessor((row) => displayOrDash(row.currentOwner), {
      id: 'currentOwner',
      header: 'Current owner',
    }),
    columnHelper.display({
      id: 'aging',
      header: 'Aging',
      cell: ({ row }) =>
        row.original.agingDays == null
          ? '—'
          : h(
              Badge,
              { variant: row.original.agingDays >= 14 ? 'destructive' : 'secondary' },
              () => `${row.original.agingDays} days`,
            ),
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
  ] as ColumnDef<ValidationWorkflowRow>[]
}
