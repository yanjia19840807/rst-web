import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import AgingBadge from '@/components/AgingBadge.vue'
import '@/components/ui/data-table/types'
import { formatDateTime } from '@/lib/datetime'
import {
  formatHc,
  formatMeasuredCapacity,
  formatMeasuredHc,
  measuredCapacityTone,
} from '@/lib/hcFormat'

import type { ApprovalQueueItem } from '../types'
import ApprovalDecisionBadge from './ApprovalDecisionBadge.vue'
import ApprovalQueueRowActions from './ApprovalQueueRowActions.vue'
import ApprovalToolkitCell from './ApprovalToolkitCell.vue'

export type ApprovalQueueTab = 'Awaiting Review' | 'Completed Task'

export type ApprovalQueueColumnOptions = {
  tab: ApprovalQueueTab
  onReview?: (item: ApprovalQueueItem) => void
  onToolkitInfo?: (item: ApprovalQueueItem) => void
}

const columnHelper = createColumnHelper<ApprovalQueueItem>()

export function previousStepLabel(step?: string | null) {
  const value = step?.trim()
  if (!value || value === 'Submitted') return '—'
  return value
}

export function createApprovalQueueColumns(
  options: ApprovalQueueColumnOptions,
): ColumnDef<ApprovalQueueItem>[] {
  return [
    columnHelper.accessor('exerciseCode', {
      header: 'Exercise code',
      cell: ({ row }) => h('span', { class: 'font-semibold' }, row.original.exerciseCode),
    }),
    columnHelper.accessor((row) => row.center || '—', {
      id: 'center',
      header: 'GBS',
    }),
    columnHelper.accessor((row) => row.domain || '—', {
      id: 'domain',
      header: 'Domain',
    }),
    columnHelper.accessor((row) => row.pl3Name || '—', {
      id: 'pl3Name',
      header: 'PL3',
    }),
    columnHelper.display({
      id: 'toolkitName',
      header: 'Toolkit',
      cell: ({ row }) =>
        h(ApprovalToolkitCell, {
          name: row.original.toolkitName || '—',
          canInfo: Boolean(row.original.exerciseId && row.original.toolkitName),
          onInfo: () => options.onToolkitInfo?.(row.original),
        }),
    }),
    columnHelper.accessor((row) => row.supervisor || '—', {
      id: 'supervisor',
      header: 'Supervisor',
    }),
    columnHelper.accessor((row) => formatDateTime(row.submittedAt), {
      id: 'submittedAt',
      header: 'Submitted Date',
    }),
    columnHelper.accessor((row) => formatHc(row.deliveryHc), {
      id: 'deliveryHc',
      header: 'Delivery HC',
    }),
    columnHelper.accessor((row) => formatMeasuredHc(row.rightSizingHc), {
      id: 'rightSizingHc',
      header: 'Right Sizing HC',
    }),
    columnHelper.accessor((row) => formatHc(row.productionSupport), {
      id: 'productionSupport',
      header: 'Production Support',
    }),
    columnHelper.accessor((row) => formatMeasuredCapacity(row.rightSizingHc, row.capacityCreation), {
      id: 'capacityCreation',
      header: 'Capacity Creation',
      cell: ({ row }) =>
        h(
          'span',
          {
            class: measuredCapacityTone(row.original.rightSizingHc, row.original.capacityCreation),
          },
          formatMeasuredCapacity(row.original.rightSizingHc, row.original.capacityCreation),
        ),
    }),
    columnHelper.accessor((row) => previousStepLabel(row.previousStep), {
      id: 'previousStep',
      header: 'Previous Step',
    }),
    columnHelper.accessor((row) => row.previousActor || '—', {
      id: 'previousActor',
      header: 'Previous Actor',
    }),
    columnHelper.accessor((row) => formatDateTime(row.previousStepAt), {
      id: 'previousStepAt',
      header: 'Previous Step At',
    }),
    columnHelper.display({
      id: 'aging',
      header: 'Aging',
      cell: ({ row }) => h(AgingBadge, { days: row.original.agingDays, fallbackZero: true }),
    }),
    columnHelper.display({
      id: 'myDecision',
      header: 'My Decision',
      cell: ({ row }) => h(ApprovalDecisionBadge, { decision: row.original.myDecision }),
    }),
    columnHelper.accessor((row) => formatDateTime(row.myCompletedAt), {
      id: 'myCompletedAt',
      header: 'Completed On',
    }),
    columnHelper.accessor((row) => row.completedStep || '—', {
      id: 'completedStep',
      header: 'Completed Step',
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      header: 'Action',
      cell: ({ row }) =>
        h(ApprovalQueueRowActions, {
          label: options.tab === 'Awaiting Review' ? 'Review' : 'View',
          onReview: () => options.onReview?.(row.original),
        }),
    }),
  ] as ColumnDef<ApprovalQueueItem>[]
}

export function approvalQueueVisibility(tab: ApprovalQueueTab) {
  const awaiting = tab === 'Awaiting Review'
  return {
    previousStep: awaiting,
    previousActor: awaiting,
    previousStepAt: awaiting,
    aging: awaiting,
    myDecision: !awaiting,
    myCompletedAt: !awaiting,
    completedStep: !awaiting,
  }
}
