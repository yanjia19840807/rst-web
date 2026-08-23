import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import AgingBadge from '@/components/AgingBadge.vue'
import '@/components/ui/data-table/types'
import { formatDate } from '@/lib/datetime'
import {
  formatHc,
  formatMeasuredCapacity,
  formatMeasuredHc,
  measuredCapacityTone,
} from '@/lib/hcFormat'

import type { Exercise } from '../types'
import { currentStepLabel, isReturned } from '../workflowLabels'
import ExerciseCurrentStepCell from './ExerciseCurrentStepCell.vue'
import ExerciseRowActions from './ExerciseRowActions.vue'

export type ExerciseListColumnOptions = {
  onOpen?: (exercise: Exercise) => void
  onWithdraw?: (exercise: Exercise) => void
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
    }),
    columnHelper.accessor((row) => row.snapshot.toolkit.name, {
      id: 'toolkitName',
      header: 'Toolkit',
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
    columnHelper.accessor((row) => formatDate(row.createdAt), {
      id: 'createdAt',
      header: 'Created Date',
    }),
    columnHelper.accessor((row) => formatDate(row.submittedAt), {
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
      header: 'Aging',
      cell: ({ row }) => h(AgingBadge, { days: row.original.agingDays }),
    }),
    columnHelper.accessor((row) => formatDate(row.archivedAt), {
      id: 'archivedAt',
      header: 'Archived Date',
    }),
    columnHelper.accessor((row) => currentStepLabel(row), {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        h(
          'span',
          { title: row.original.lastDecisionComment || undefined },
          currentStepLabel(row.original),
        ),
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      header: () => h('div', { class: 'text-right' }, 'Action'),
      cell: ({ row }) =>
        h('div', { class: 'relative' }, [
          h(ExerciseRowActions, {
            canWithdraw: row.original.workflowStatus === 'UNDER_REVIEW',
            onWithdraw: () => options.onWithdraw?.(row.original),
            onOpen: () => options.onOpen?.(row.original),
          }),
        ]),
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
    }),
  ] as ColumnDef<Exercise>[]
}
