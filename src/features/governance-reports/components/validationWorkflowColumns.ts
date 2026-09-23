import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import AgingBadge from '@/components/AgingBadge.vue'
import '@/components/ui/data-table/types'
import ToolkitNameCell from '@/features/exercise-management/components/ToolkitNameCell.vue'
import { FieldUnit, withUnit } from '@/features/exercise-management/fieldUnits'

import { joinCommaTokens } from '@/lib/commaTokens'
import { formatCivilDateTime, formatMonth } from '@/lib/datetime'

import { displayOrDash } from '../reportFormat'
import type { ValidationWorkflowRow } from '../types'
import CapacityCell from './CapacityCell.vue'

export type ValidationWorkflowColumnOptions = {
  onToolkitInfo?: (row: ValidationWorkflowRow) => void
}

const columnHelper = createColumnHelper<ValidationWorkflowRow>()

function joined(values: string[] | null | undefined) {
  return displayOrDash(values?.filter((item) => item.trim()).join(', '))
}

function joinedCountries(values: string[] | null | undefined) {
  return displayOrDash(joinCommaTokens(values))
}

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
    columnHelper.accessor((row) => formatMonth(row.sizingMonth), {
      id: 'sizingMonth',
      header: 'Sizing Month',
    }),
    columnHelper.accessor((row) => formatCivilDateTime(row.submittedDate), {
      id: 'submittedDate',
      header: 'Submitted at',
    }),
    columnHelper.accessor((row) => displayOrDash(row.gbs), { id: 'gbs', header: 'GBS Center' }),
    columnHelper.accessor((row) => displayOrDash(row.domain), { id: 'domain', header: 'Domain' }),
    columnHelper.accessor((row) => displayOrDash(row.pl1), { id: 'pl1', header: 'PL1' }),
    columnHelper.accessor((row) => displayOrDash(row.pl2), { id: 'pl2', header: 'PL2' }),
    columnHelper.accessor((row) => displayOrDash(row.pl3), { id: 'pl3', header: 'PL3' }),
    columnHelper.accessor((row) => joined(row.carriers), { id: 'carriers', header: 'Carrier' }),
    columnHelper.accessor((row) => joined(row.sites), { id: 'sites', header: 'GBS Site' }),
    columnHelper.accessor((row) => joinedCountries(row.customerCountries), {
      id: 'customerCountries',
      header: 'Customer Country',
    }),
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
      header: withUnit('Aging', FieldUnit.days),
      cell: ({ row }) => h(AgingBadge, { days: row.original.agingDays }),
    }),
    columnHelper.display({
      id: 'capacityCreation',
      header: withUnit('Capacity Creation', FieldUnit.hc),
      cell: ({ row }) => h(CapacityCell, { value: row.original.capacityCreation }),
    }),
    columnHelper.display({
      id: 'capacityPct',
      header: withUnit('Capacity Creation', FieldUnit.percent),
      cell: ({ row }) => h(CapacityCell, { value: row.original.capacityPct, percent: true }),
    }),
    columnHelper.accessor((row) => row.volumeYoY || '—', {
      id: 'volumeYoY',
      header: withUnit('Volume Increase YoY', FieldUnit.percent),
    }),
  ] as ColumnDef<ValidationWorkflowRow>[]
}
