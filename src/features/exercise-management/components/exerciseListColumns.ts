import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import AgingBadge from '@/components/AgingBadge.vue'
import '@/components/ui/data-table/types'
import { formatInstantForCenter, formatMonth } from '@/lib/datetime'
import { FieldUnit, withUnit } from '../fieldUnits'
import {
  formatHc,
  formatMeasuredCapacity,
  formatMeasuredHc,
  measuredCapacityTone,
} from '@/lib/hcFormat'

import ScopeChangedBadge from '@/features/timesheet-alignment/components/ScopeChangedBadge.vue'

import type { Exercise } from '../types'
import { currentStepLabel, isReturned } from '../workflowLabels'
import ExerciseCurrentStepCell from './ExerciseCurrentStepCell.vue'
import ExerciseRowActions from './ExerciseRowActions.vue'
import ToolkitNameCell from './ToolkitNameCell.vue'

export type ExerciseListColumnOptions = {
  onOpen?: (exercise: Exercise) => void
  onToolkitInfo?: (exercise: Exercise) => void
}

const columnHelper = createColumnHelper<Exercise>()

export function deliveryHc(exercise: Exercise) {
  if (exercise.deliveryHc != null && exercise.deliveryHc !== '') {
    return formatHc(exercise.deliveryHc)
  }
  return exercise.snapshot.sharedKpis
    .reduce((sum, item) => sum + Number(item.deliveryHc), 0)
    .toFixed(1)
}

export function currentReviewerName(exercise: Exercise) {
  if (exercise.workflowStatus !== 'UNDER_REVIEW') return '—'
  return exercise.currentReviewer || '—'
}

export function createExerciseListColumns(
  options: ExerciseListColumnOptions = {},
): ColumnDef<Exercise>[] {
  return [
    columnHelper.accessor('exerciseCode', {
      header: 'Exercise Code',
      cell: ({ row }) =>
        h('span', { class: 'inline-flex flex-wrap items-center gap-1.5' }, [
          h('span', row.original.exerciseCode),
          row.original.timesheetAlignment?.structuralDrift ? h(ScopeChangedBadge) : null,
        ]),
    }),
    columnHelper.display({
      id: 'toolkitName',
      header: 'Toolkit',
      cell: ({ row }) =>
        h(ToolkitNameCell, {
          name: row.original.snapshot.toolkit.name || '—',
          canInfo: Boolean(row.original.snapshot.toolkit.name),
          onInfo: () => options.onToolkitInfo?.(row.original),
        }),
    }),
    columnHelper.accessor((row) => deliveryHc(row), {
      id: 'deliveryHc',
      header: 'Delivery HC',
    }),
    columnHelper.accessor((row) => formatMeasuredHc(row.rightSizingHc), {
      id: 'rightSizingHc',
      header: 'Right Sizing HC',
    }),
    columnHelper.accessor((row) => formatHc(row.productionSupport), {
      id: 'productionSupport',
      header: 'Production Support (FTE)',
    }),
    columnHelper.accessor((row) => formatMeasuredCapacity(row.rightSizingHc, row.capacityCreation), {
      id: 'capacityCreation',
      header: 'Capacity Creation (HC)',
      cell: ({ row }) =>
        h(
          'span',
          { class: measuredCapacityTone(row.original.rightSizingHc, row.original.capacityCreation) },
          formatMeasuredCapacity(row.original.rightSizingHc, row.original.capacityCreation),
        ),
    }),
    columnHelper.accessor((row) => formatMonth(row.sizingMonth), {
      id: 'sizingMonth',
      header: 'Sizing Month',
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.submittedAt, row.snapshot.toolkit.center), {
      id: 'submittedAt',
      header: 'Submitted Date',
    }),
    columnHelper.display({
      id: 'currentStep',
      header: 'Current Step',
      cell: ({ row }) =>
        h(ExerciseCurrentStepCell, {
          label: currentStepLabel(row.original),
          returned: isReturned(row.original),
          title: row.original.lastDecisionComment || undefined,
        }),
    }),
    columnHelper.accessor((row) => currentReviewerName(row), {
      id: 'currentReviewer',
      header: 'Current Reviewer',
    }),
    columnHelper.display({
      id: 'aging',
      header: withUnit('Aging', FieldUnit.days),
      cell: ({ row }) => h(AgingBadge, { days: row.original.agingDays }),
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.archivedAt, row.snapshot.toolkit.center), {
      id: 'archivedAt',
      header: 'Validated Date',
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      header: () => h('div', { class: 'text-right' }, 'Action'),
      cell: ({ row }) =>
        h(ExerciseRowActions, {
          onOpen: () => options.onOpen?.(row.original),
        }),
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
    }),
  ] as ColumnDef<Exercise>[]
}
