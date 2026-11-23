import { h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'

import CreatedByText from '@/components/CreatedByText.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TableTextLink from '@/components/TableTextLink.vue'
import '@/components/ui/data-table/types'
import { formatCivilDate, formatInstantForCenter, formatMonth } from '@/lib/datetime'

import type { TimesheetSyncRunHeader } from '../types'

export type TimesheetActiveRow = {
  kind: 'DAILY' | 'MONTHLY'
  run: TimesheetSyncRunHeader | null
}

export type TimesheetActiveColumnOptions = {
  onDownload?: (row: TimesheetSyncRunHeader) => void
  downloadingIds?: readonly string[]
}

export type TimesheetSyncColumnOptions = {
  onViewIssues?: (row: TimesheetSyncRunHeader) => void
  onDownload?: (row: TimesheetSyncRunHeader) => void
  downloadingIds?: readonly string[]
}

const activeHelper = createColumnHelper<TimesheetActiveRow>()
const runHelper = createColumnHelper<TimesheetSyncRunHeader>()

function dash(value: string | number | null | undefined) {
  if (value == null || value === '') return '—'
  return String(value)
}

function sourceLabel(value: string | null | undefined) {
  if (!value) return '—'
  if (value.toUpperCase() === 'SHAREPOINT') return 'SharePoint'
  if (value.toUpperCase() === 'MANUAL') return 'Upload'
  return value
}

function syncDateLabel(kind: string | null | undefined, syncDate: string | null | undefined) {
  if (!syncDate) return '—'
  return kind === 'MONTHLY' || kind === 'SHARED_KPI' ? formatMonth(syncDate) : formatCivilDate(syncDate)
}

const interimKindLabel: Record<string, string> = {
  MYHR: 'MyHR',
  SHARED_KPI: 'SKPI',
}

function interimKindLabelOf(kind: string | null | undefined) {
  if (!kind) return '—'
  return interimKindLabel[kind] ?? kind
}

function fileCell(
  row: TimesheetSyncRunHeader | null,
  onDownload?: (row: TimesheetSyncRunHeader) => void,
  downloadingIds: readonly string[] = [],
) {
  if (!row?.sourceFileName) return '—'
  if (!row.hasSourceFile || !row.id) return row.sourceFileName
  return h(
    TableTextLink,
    {
      loading: downloadingIds.includes(row.id),
      onClick: () => onDownload?.(row),
    },
    () => row.sourceFileName,
  )
}

function viewIssuesButton(row: TimesheetSyncRunHeader | null, onViewIssues?: (row: TimesheetSyncRunHeader) => void) {
  if (!row) return '—'
  return h(TableTextLink, { onClick: () => onViewIssues?.(row) }, () => 'View issues')
}

export function createTimesheetActiveColumns(
  options: TimesheetActiveColumnOptions = {},
): ColumnDef<TimesheetActiveRow>[] {
  return [
    activeHelper.display({
      id: 'center',
      header: 'Center',
      cell: ({ row }) => dash(row.original.run?.center),
    }),
    activeHelper.accessor('kind', {
      header: 'Kind',
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.kind),
    }),
    activeHelper.display({
      id: 'syncDate',
      header: 'Sync date',
      cell: ({ row }) => syncDateLabel(row.original.kind, row.original.run?.syncDate),
    }),
    activeHelper.display({
      id: 'sourceType',
      header: 'Source',
      cell: ({ row }) => sourceLabel(row.original.run?.sourceType),
    }),
    activeHelper.display({
      id: 'sourceFileName',
      header: 'File',
      cell: ({ row }) => fileCell(row.original.run, options.onDownload, options.downloadingIds),
    }),
    activeHelper.display({
      id: 'rowCount',
      header: 'Rows',
      cell: ({ row }) => dash(row.original.run?.rowCount),
    }),
    activeHelper.display({
      id: 'createdBy',
      header: 'Created by',
      cell: ({ row }) => h(CreatedByText, { actor: row.original.run?.createdBy }),
    }),
    activeHelper.display({
      id: 'startedAt',
      header: 'Started at',
      cell: ({ row }) =>
        formatInstantForCenter(row.original.run?.startedAt, row.original.run?.center, { seconds: true }),
    }),
    activeHelper.display({
      id: 'completedAt',
      header: 'Completed at',
      cell: ({ row }) =>
        formatInstantForCenter(row.original.run?.completedAt, row.original.run?.center, { seconds: true }),
    }),
  ]
}

export function createTimesheetRunColumns(
  options: TimesheetSyncColumnOptions = {},
): ColumnDef<TimesheetSyncRunHeader>[] {
  return [
    runHelper.accessor((row) => dash(row.center), {
      id: 'center',
      header: 'Center',
    }),
    runHelper.accessor('kind', {
      header: 'Kind',
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.kind),
    }),
    runHelper.accessor('status', {
      header: 'Status',
      cell: ({ row }) => h(StatusBadge, { status: row.original.status }),
    }),
    runHelper.accessor((row) => syncDateLabel(row.kind, row.syncDate), {
      id: 'syncDate',
      header: 'Sync date',
    }),
    runHelper.accessor((row) => sourceLabel(row.sourceType), {
      id: 'sourceType',
      header: 'Source',
    }),
    runHelper.display({
      id: 'sourceFileName',
      header: 'File',
      cell: ({ row }) => fileCell(row.original, options.onDownload, options.downloadingIds),
    }),
    runHelper.display({
      id: 'createdBy',
      header: 'Created by',
      cell: ({ row }) => h(CreatedByText, { actor: row.original.createdBy }),
    }),
    runHelper.accessor((row) => formatInstantForCenter(row.startedAt, row.center, { seconds: true }), {
      id: 'startedAt',
      header: 'Started at',
    }),
    runHelper.accessor((row) => formatInstantForCenter(row.completedAt, row.center, { seconds: true }), {
      id: 'completedAt',
      header: 'Completed at',
    }),
    runHelper.display({
      id: 'actions',
      header: 'Action',
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
      cell: ({ row }) => viewIssuesButton(row.original, options.onViewIssues),
    }),
  ]
}

export function createInterimActiveColumns(
  options: TimesheetSyncColumnOptions = {},
): ColumnDef<TimesheetSyncRunHeader>[] {
  return [
    runHelper.accessor((row) => interimKindLabelOf(row.kind), {
      id: 'kind',
      header: 'Kind',
      cell: ({ row }) => h('span', { class: 'font-medium' }, interimKindLabelOf(row.original.kind)),
    }),
    runHelper.accessor((row) => syncDateLabel(row.kind, row.syncDate), {
      id: 'syncDate',
      header: 'Sync date',
    }),
    runHelper.display({
      id: 'sourceFileName',
      header: 'File',
      cell: ({ row }) => fileCell(row.original, options.onDownload, options.downloadingIds),
    }),
    runHelper.accessor((row) => dash(row.rowCount), {
      id: 'rowCount',
      header: 'Rows',
    }),
    runHelper.display({
      id: 'createdBy',
      header: 'Created by',
      cell: ({ row }) => h(CreatedByText, { actor: row.original.createdBy }),
    }),
    runHelper.accessor((row) => formatInstantForCenter(row.startedAt, row.center, { seconds: true }), {
      id: 'startedAt',
      header: 'Started at',
    }),
    runHelper.accessor((row) => formatInstantForCenter(row.completedAt, row.center, { seconds: true }), {
      id: 'completedAt',
      header: 'Completed at',
    }),
    runHelper.display({
      id: 'actions',
      header: 'Action',
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
      cell: ({ row }) => viewIssuesButton(row.original, options.onViewIssues),
    }),
  ]
}

export function createInterimUploadColumns(
  options: TimesheetSyncColumnOptions = {},
): ColumnDef<TimesheetSyncRunHeader>[] {
  return [
    runHelper.accessor((row) => interimKindLabelOf(row.kind), {
      id: 'kind',
      header: 'Kind',
      cell: ({ row }) => h('span', { class: 'font-medium' }, interimKindLabelOf(row.original.kind)),
    }),
    runHelper.accessor('status', {
      header: 'Status',
      cell: ({ row }) => h(StatusBadge, { status: row.original.status }),
    }),
    runHelper.accessor((row) => syncDateLabel(row.kind, row.syncDate), {
      id: 'syncDate',
      header: 'Sync date',
    }),
    runHelper.display({
      id: 'sourceFileName',
      header: 'File',
      cell: ({ row }) => fileCell(row.original, options.onDownload, options.downloadingIds),
    }),
    runHelper.display({
      id: 'createdBy',
      header: 'Created by',
      cell: ({ row }) => h(CreatedByText, { actor: row.original.createdBy }),
    }),
    runHelper.accessor((row) => formatInstantForCenter(row.startedAt, row.center, { seconds: true }), {
      id: 'startedAt',
      header: 'Started at',
    }),
    runHelper.accessor((row) => formatInstantForCenter(row.completedAt, row.center, { seconds: true }), {
      id: 'completedAt',
      header: 'Completed at',
    }),
    runHelper.display({
      id: 'actions',
      header: 'Action',
      meta: { headerClass: 'text-right', cellClass: 'text-right' },
      cell: ({ row }) => viewIssuesButton(row.original, options.onViewIssues),
    }),
  ]
}
