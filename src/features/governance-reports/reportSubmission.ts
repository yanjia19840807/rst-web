import { h, type VNode } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import TableTextLink from '@/components/TableTextLink.vue'

export type ReportSource = 'repository' | 'support' | 'validation'

type ReportList = {
  source: ReportSource
  listName: string
  listLabel: string
  backLabel: string
  reviewName: string
}

const LISTS: Record<ReportSource, ReportList> = {
  repository: {
    source: 'repository',
    listName: 'approver-repository',
    listLabel: 'RST Repository',
    backLabel: 'Back to RST Repository',
    reviewName: 'approver-repository-submission',
  },
  support: {
    source: 'support',
    listName: 'approver-support-repository',
    listLabel: 'Support Repository',
    backLabel: 'Back to Support Repository',
    reviewName: 'approver-support-submission',
  },
  validation: {
    source: 'validation',
    listName: 'approver-validation-workflow',
    listLabel: 'Validation Workflow',
    backLabel: 'Back to Validation Workflow',
    reviewName: 'approver-validation-submission',
  },
}

export function reportList(source: ReportSource) {
  return LISTS[source]
}

export function reportSourceFrom(value: unknown): ReportSource | null {
  return value === 'repository' || value === 'support' || value === 'validation' ? value : null
}

export function reportSubmissionLocation(
  source: ReportSource,
  submissionId: string,
): RouteLocationRaw {
  return {
    name: LISTS[source].reviewName,
    params: { submissionId },
  }
}

export function exerciseNoLink(
  source: ReportSource,
  exerciseNo: string | null | undefined,
  submissionId: string | null | undefined,
): VNode | string {
  const label = exerciseNo?.trim() || '—'
  const id = submissionId?.trim()
  if (!id) return label
  return h(
    TableTextLink,
    {
      to: reportSubmissionLocation(source, id),
      title: label === '—' ? 'View submission' : `View ${label}`,
    },
    () => label,
  )
}
