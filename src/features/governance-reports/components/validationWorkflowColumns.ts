import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import AgingBadge from '@/components/AgingBadge.vue'
import '@/components/ui/data-table/types'
import ToolkitNameCell from '@/features/exercise-management/components/ToolkitNameCell.vue'

import { displayOrDash, formatSignedPct } from '../reportFormat'
import type { ValidationWorkflowRow } from '../types'
import CapacityCell from './CapacityCell.vue'

export type ValidationWorkflowColumnOptions = {
  onToolkitInfo?: (row: ValidationWorkflowRow) => void
}

const columnHelper = createColumnHelper<ValidationWorkflowRow>()

export function createValidationWorkflowColumns(
  options: ValidationWorkflowColumnOptions = {},
): ColumnDef<ValidationWorkflowRow>[] {
  return [
    columnHelper.accessor('exerciseNo', { header: 'Exercise No' }),
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
    columnHelper.accessor((row) => displayOrDash(row.gbs), { id: 'gbs', header: 'GBS Center' }),
    columnHelper.accessor((row) => displayOrDash(row.domain), { id: 'domain', header: 'Domain' }),
    columnHelper.accessor((row) => displayOrDash(row.pl1), { id: 'pl1', header: 'PL1' }),
    columnHelper.accessor((row) => displayOrDash(row.currentStep), {
      id: 'currentStep',
      header: 'Current Step',
    }),
    columnHelper.accessor((row) => displayOrDash(row.currentOwner), {
      id: 'currentOwner',
      header: 'Current Owner',
    }),
    columnHelper.display({
      id: 'aging',
      header: 'Aging',
      cell: ({ row }) => h(AgingBadge, { days: row.original.agingDays }),
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
