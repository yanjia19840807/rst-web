import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import AgingBadge from '@/components/AgingBadge.vue'
import '@/components/ui/data-table/types'
import { joinCommaTokens } from '@/lib/commaTokens'
import { formatInstantForCenter, formatMonth } from '@/lib/datetime'
import { FieldUnit, withUnit } from '../fieldUnits'
import {
  formatHc,
  formatMeasuredCapacity,
  formatMeasuredHc,
  measuredCapacityTone,
} from '@/lib/hcFormat'

import ScopeChangedBadge from '@/features/timesheet-alignment/components/ScopeChangedBadge.vue'

import CreatedByText from '@/components/CreatedByText.vue'
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

function displayOrDash(value: string | null | undefined) {
  return value && value.trim() ? value : '—'
}

function distinctJoined(values: Array<string | null | undefined>) {
  const items: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const token = value?.trim()
    if (token && !seen.has(token)) {
      seen.add(token)
      items.push(token)
    }
  }
  return items.length ? items.join(', ') : '—'
}

function kpiValues(exercise: Exercise, getter: (line: Exercise['snapshot']['sharedKpis'][number]) => string) {
  return (exercise.snapshot.sharedKpis ?? []).map(getter)
}

export function createExerciseListColumns(
  options: ExerciseListColumnOptions = {},
): ColumnDef<Exercise>[] {
  return [
    columnHelper.accessor('exerciseCode', {
      header: 'Exercise No',
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
    columnHelper.accessor((row) => formatMonth(row.sizingMonth), {
      id: 'sizingMonth',
      header: 'Sizing Month',
    }),
    columnHelper.accessor((row) => displayOrDash(row.snapshot.toolkit.center), {
      id: 'center',
      header: 'GBS Center',
    }),
    columnHelper.accessor((row) => displayOrDash(row.snapshot.toolkit.domain), {
      id: 'domain',
      header: 'Domain',
    }),
    columnHelper.accessor((row) => displayOrDash(row.snapshot.toolkit.pl1), {
      id: 'pl1',
      header: 'PL1',
    }),
    columnHelper.accessor((row) => displayOrDash(row.snapshot.toolkit.pl2), {
      id: 'pl2',
      header: 'PL2',
    }),
    columnHelper.accessor((row) => displayOrDash(row.snapshot.toolkit.pl3Name), {
      id: 'pl3',
      header: 'PL3',
    }),
    columnHelper.accessor((row) => distinctJoined(kpiValues(row, (line) => line.carrier)), {
      id: 'carriers',
      header: 'Carrier',
    }),
    columnHelper.accessor((row) => distinctJoined(kpiValues(row, (line) => line.site)), {
      id: 'sites',
      header: 'GBS Site',
    }),
    columnHelper.accessor((row) => joinCommaTokens(kpiValues(row, (line) => line.customerCountry)) || '—', {
      id: 'customerCountries',
      header: 'Customer Country',
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
    columnHelper.display({
      id: 'createdBy',
      header: 'Created by',
      cell: ({ row }) => h(CreatedByText, { actor: row.original.createdBy }),
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.createdAt, row.snapshot.toolkit.center), {
      id: 'createdAt',
      header: 'Created at',
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.submittedAt, row.snapshot.toolkit.center), {
      id: 'submittedAt',
      header: 'Submitted at',
    }),
    columnHelper.accessor((row) => formatInstantForCenter(row.archivedAt, row.snapshot.toolkit.center), {
      id: 'archivedAt',
      header: 'Validated at',
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
      cell: ({ row }) =>
        row.original.workflowStatus === 'UNDER_REVIEW' && row.original.currentReviewerBy
          ? h(CreatedByText, { actor: row.original.currentReviewerBy })
          : currentReviewerName(row.original),
    }),
    columnHelper.display({
      id: 'aging',
      header: withUnit('Aging', FieldUnit.days),
      cell: ({ row }) => h(AgingBadge, { days: row.original.agingDays }),
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
