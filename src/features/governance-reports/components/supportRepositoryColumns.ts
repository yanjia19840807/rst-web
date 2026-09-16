import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'

import { formatMonth } from '@/lib/datetime'
import ToolkitNameCell from '@/features/exercise-management/components/ToolkitNameCell.vue'

import { formatHc, formatVolume } from '../reportFormat'
import type { SupportCategorySummary, SupportRow } from '../types'

export type SupportRowColumnOptions = {
  onToolkitInfo?: (row: SupportRow) => void
}

const categoryHelper = createColumnHelper<SupportCategorySummary>()
const rowHelper = createColumnHelper<SupportRow>()

export function createSupportCategoryColumns(): ColumnDef<SupportCategorySummary>[] {
  return [
    categoryHelper.accessor('category', { header: 'Standard Category' }),
    categoryHelper.accessor((row) => formatHc(row.supportFte), {
      id: 'supportFte',
      header: 'Support FTE',
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
    rowHelper.accessor('exerciseNo', { header: 'Exercise NO' }),
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
    rowHelper.accessor('center', { header: 'GBS Center' }),
    rowHelper.accessor('domain', { header: 'Domain' }),
    rowHelper.accessor('pl3', { header: 'PL3' }),
    rowHelper.accessor('standardCategory', { header: 'Standard Category' }),
    rowHelper.accessor('activity', { header: 'Activity' }),
    rowHelper.accessor('frequency', { header: 'Frequency' }),
    rowHelper.accessor((row) => formatVolume(row.volume), { id: 'volume', header: 'Volume' }),
    rowHelper.accessor('uom', { header: 'UOM' }),
    rowHelper.accessor((row) => formatHc(row.fte), { id: 'fte', header: 'FTE' }),
    rowHelper.accessor((row) => row.comments || '—', { id: 'comments', header: 'Comments' }),
  ] as ColumnDef<SupportRow>[]
}
