import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import AgingBadge from '@/components/AgingBadge.vue'
import CreatedByText from '@/components/CreatedByText.vue'
import '@/components/ui/data-table/types'
import { FieldUnit, withUnit } from '@/features/exercise-management/fieldUnits'
import { joinCommaTokens } from '@/lib/commaTokens'
import { formatInstantForCenter, formatMonth } from '@/lib/datetime'
import {
  formatHc,
  formatMeasuredCapacity,
  formatMeasuredHc,
  measuredCapacityTone,
} from '@/lib/hcFormat'

import ScopeChangedBadge from '@/features/timesheet-alignment/components/ScopeChangedBadge.vue'

import {
  AWAITING_REVIEW_TAB,
  approvalQueueTabQuery,
  type ApprovalQueueTab,
} from '../approvalQueueTabs'
import type { ApprovalQueueItem } from '../types'
import ToolkitNameCell from '@/features/exercise-management/components/ToolkitNameCell.vue'

import ApprovalDecisionBadge from './ApprovalDecisionBadge.vue'
import ApprovalQueueRowActions from './ApprovalQueueRowActions.vue'

export type { ApprovalQueueTab }

export type ApprovalQueueColumnOptions = {
  tab: ApprovalQueueTab
  onToolkitInfo?: (item: ApprovalQueueItem) => void
}

const columnHelper = createColumnHelper<ApprovalQueueItem>()

export function previousStepLabel(step?: string | null) {
  const value = step?.trim()
  if (!value || value === 'Submitted') return '—'
  return value
}

function displayOrDash(value: string | null | undefined) {
  return value && value.trim() ? value : '—'
}

function distinctJoined(values: string[] | null | undefined) {
  const items: string[] = []
  const seen = new Set<string>()
  for (const value of values ?? []) {
    const token = value?.trim()
    if (token && !seen.has(token)) {
      seen.add(token)
      items.push(token)
    }
  }
  return items.length ? items.join(', ') : '—'
}

export function createApprovalQueueColumns(
  options: ApprovalQueueColumnOptions,
): ColumnDef<ApprovalQueueItem>[] {
  return [
    columnHelper.accessor('exerciseCode', {
      header: 'Exercise No',
      cell: ({ row }) =>
        h('span', { class: 'inline-flex flex-wrap items-center gap-1.5 font-semibold' }, [
          row.original.exerciseCode,
          row.original.scopeChanged ? h(ScopeChangedBadge) : null,
        ]),
    }),
    columnHelper.display({
      id: 'toolkitName',
      header: 'Toolkit',
      cell: ({ row }) =>
        h(ToolkitNameCell, {
          name: row.original.toolkitName || '—',
          canInfo: Boolean(row.original.exerciseId && row.original.toolkitName),
          onInfo: () => options.onToolkitInfo?.(row.original),
        }),
    }),
    columnHelper.accessor((row) => formatMonth(row.sizingMonth), {
      id: 'sizingMonth',
      header: 'Sizing Month',
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.submittedAt, row.center), {
      id: 'submittedAt',
      header: 'Submitted at',
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.myCompletedAt, row.center), {
      id: 'myCompletedAt',
      header: 'Completed at',
    }),
    columnHelper.accessor((row) => displayOrDash(row.center), {
      id: 'center',
      header: 'GBS Center',
    }),
    columnHelper.accessor((row) => displayOrDash(row.domain), {
      id: 'domain',
      header: 'Domain',
    }),
    columnHelper.accessor((row) => displayOrDash(row.pl1), {
      id: 'pl1',
      header: 'PL1',
    }),
    columnHelper.accessor((row) => displayOrDash(row.pl2), {
      id: 'pl2',
      header: 'PL2',
    }),
    columnHelper.accessor((row) => displayOrDash(row.pl3Name), {
      id: 'pl3Name',
      header: 'PL3',
    }),
    columnHelper.accessor((row) => distinctJoined(row.carriers), {
      id: 'carriers',
      header: 'Carrier',
    }),
    columnHelper.accessor((row) => distinctJoined(row.sites), {
      id: 'sites',
      header: 'GBS Site',
    }),
    columnHelper.accessor((row) => joinCommaTokens(row.customerCountries) || '—', {
      id: 'customerCountries',
      header: 'Customer Country',
    }),
    columnHelper.accessor((row) => displayOrDash(row.supervisor), {
      id: 'supervisor',
      header: 'Supervisor',
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
      header: 'Production Support (FTE)',
    }),
    columnHelper.accessor((row) => formatMeasuredCapacity(row.rightSizingHc, row.capacityCreation), {
      id: 'capacityCreation',
      header: 'Capacity Creation (HC)',
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
      cell: ({ row }) =>
        row.original.previousActorBy
          ? h(CreatedByText, { actor: row.original.previousActorBy })
          : (row.original.previousActor || '—'),
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.previousStepAt, row.center), {
      id: 'previousStepAt',
      header: 'Previous Step At',
    }),
    columnHelper.display({
      id: 'aging',
      header: withUnit('Aging', FieldUnit.days),
      cell: ({ row }) => h(AgingBadge, { days: row.original.agingDays, fallbackZero: true }),
    }),
    columnHelper.display({
      id: 'myDecision',
      header: 'My Decision',
      cell: ({ row }) => h(ApprovalDecisionBadge, { decision: row.original.myDecision }),
    }),
    columnHelper.accessor((row) => row.completedStep || '—', {
      id: 'completedStep',
      header: 'Completed Step',
    }),
    columnHelper.display({
      id: 'actedBy',
      header: 'Handler',
      cell: ({ row }) =>
        row.original.actedBy
          ? h(CreatedByText, { actor: row.original.actedBy })
          : '—',
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      header: () => h('div', { class: 'text-right' }, 'Action'),
      cell: ({ row }) =>
        h(ApprovalQueueRowActions, {
          label: options.tab === AWAITING_REVIEW_TAB ? 'Review' : 'View',
          to: {
            name: 'approver-review',
            params: { submissionId: row.original.submissionId },
            query: { tab: approvalQueueTabQuery(options.tab) },
          },
        }),
      meta: { headerClass: 'relative z-10 text-right', cellClass: 'relative z-10 text-right' },
    }),
  ] as ColumnDef<ApprovalQueueItem>[]
}

export function approvalQueueVisibility(tab: ApprovalQueueTab) {
  const awaiting = tab === AWAITING_REVIEW_TAB
  return {
    submittedAt: awaiting,
    myCompletedAt: !awaiting,
    previousStep: awaiting,
    previousActor: awaiting,
    previousStepAt: awaiting,
    aging: awaiting,
    myDecision: !awaiting,
    completedStep: !awaiting,
    actedBy: !awaiting,
  }
}
