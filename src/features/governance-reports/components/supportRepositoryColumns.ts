import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import '@/components/ui/data-table/types'

import { formatHc, formatVolume } from '../reportFormat'
import type { SupportCategorySummary, SupportRow } from '../types'

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

export function createSupportRowColumns(): ColumnDef<SupportRow>[] {
  return [
    rowHelper.accessor('exerciseNo', { header: 'Exercise NO' }),
    rowHelper.accessor('center', { header: 'GBS Center' }),
    rowHelper.accessor('domain', { header: 'Domain' }),
    rowHelper.accessor('pl3', { header: 'PL3' }),
    rowHelper.accessor('toolkit', { header: 'Toolkit' }),
    rowHelper.accessor('standardCategory', { header: 'Standard Category' }),
    rowHelper.accessor('activity', { header: 'Activity' }),
    rowHelper.accessor('frequency', { header: 'Frequency' }),
    rowHelper.accessor((row) => formatVolume(row.volume), { id: 'volume', header: 'Volume' }),
    rowHelper.accessor('uom', { header: 'UOM' }),
    rowHelper.accessor((row) => formatHc(row.fte), { id: 'fte', header: 'FTE' }),
    rowHelper.accessor((row) => row.comments || '—', { id: 'comments', header: 'Comments' }),
  ] as ColumnDef<SupportRow>[]
}
