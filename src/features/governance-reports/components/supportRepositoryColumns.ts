import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'

import { formatCivilDateTime, formatMonth } from '@/lib/datetime'
import ToolkitNameCell from '@/features/exercise-management/components/ToolkitNameCell.vue'
import { FieldUnit, withUnit } from '@/features/exercise-management/fieldUnits'

import { joinCommaTokens } from '@/lib/commaTokens'

import { displayOrDash, formatHc, formatVolume } from '../reportFormat'
import type { SupportCategorySummary, SupportRow } from '../types'

export type SupportRowColumnOptions = {
  onToolkitInfo?: (row: SupportRow) => void
}

const categoryHelper = createColumnHelper<SupportCategorySummary>()
const rowHelper = createColumnHelper<SupportRow>()

function joined(values: string[] | null | undefined) {
  return displayOrDash(values?.filter((item) => item.trim()).join(', '))
}

function joinedCountries(values: string[] | null | undefined) {
  return displayOrDash(joinCommaTokens(values))
}

export function createSupportCategoryColumns(): ColumnDef<SupportCategorySummary>[] {
  return [
    categoryHelper.accessor('category', { header: 'Standard Category' }),
    categoryHelper.accessor((row) => formatHc(row.supportFte), {
      id: 'supportFte',
      header: withUnit('Support', FieldUnit.fte),
    }),
    categoryHelper.accessor((row) => row.pctOfSupport || '—', {
      id: 'pctOfSupport',
      header: '% of support FTE',
    }),
  ] as ColumnDef<SupportCategorySummary>[]
}

export function createSupportRowColumns(
  options: SupportRowColumnOptions = {},
): ColumnDef<SupportRow>[] {
  return [
    rowHelper.accessor('exerciseNo', { header: 'Exercise No' }),
    rowHelper.display({
      id: 'toolkit',
      header: 'Toolkit',
      cell: ({ row }) =>
        h(ToolkitNameCell, {
          name: row.original.toolkit || '—',
          canInfo: Boolean(row.original.exerciseUuid && row.original.toolkit),
          onInfo: () => options.onToolkitInfo?.(row.original),
        }),
    }),
    rowHelper.accessor((row) => formatMonth(row.sizingMonth), {
      id: 'sizingMonth',
      header: 'Sizing Month',
    }),
    rowHelper.accessor((row) => formatCivilDateTime(row.validatedDate), {
      id: 'validatedDate',
      header: 'Validated Date',
    }),
    rowHelper.accessor('center', { header: 'GBS Center' }),
    rowHelper.accessor('domain', { header: 'Domain' }),
    rowHelper.accessor('pl1', { header: 'PL1' }),
    rowHelper.accessor('pl2', { header: 'PL2' }),
    rowHelper.accessor('pl3', { header: 'PL3' }),
    rowHelper.accessor((row) => joined(row.carriers), { id: 'carriers', header: 'Carrier' }),
    rowHelper.accessor((row) => joined(row.sites), { id: 'sites', header: 'GBS Site' }),
    rowHelper.accessor((row) => joinedCountries(row.customerCountries), {
      id: 'customerCountries',
      header: 'Customer Country',
    }),
    rowHelper.accessor('standardCategory', { header: 'Standard Category' }),
    rowHelper.accessor('activity', { header: 'Activity' }),
    rowHelper.accessor('frequency', { header: 'Frequency' }),
    rowHelper.accessor((row) => formatVolume(row.volume), {
      id: 'volume',
      header: withUnit('Volume', FieldUnit.transactions),
    }),
    rowHelper.accessor('uom', { header: 'UOM' }),
    rowHelper.accessor((row) => formatHc(row.fte), {
      id: 'fte',
      header: withUnit('Support', FieldUnit.fte),
    }),
    rowHelper.accessor((row) => row.comments || '—', { id: 'comments', header: 'Comments' }),
  ] as ColumnDef<SupportRow>[]
}
