import type { RouteLocationRaw } from 'vue-router'

import { approvalQueueLocation } from '@/features/approval/approvalQueueTabs'
import { exerciseListLocation } from '@/features/exercise-management/workflowLabels'

export type BreadcrumbItem = {
  label: string
  to?: RouteLocationRaw
}

type CrumbRoute = {
  name?: unknown
  params?: Record<string, unknown>
  query?: Record<string, unknown>
  meta?: Record<string, unknown>
}

function param(route: CrumbRoute, key: string) {
  const value = route.params?.[key]
  return typeof value === 'string' && value ? value : ''
}

export function exerciseDetailBreadcrumbs(input: {
  exerciseId: string
  snapshot: boolean
  workflowStatus?: string | null
  scenarioId?: string | null
  scenarioLabel?: string | null
}): BreadcrumbItem[] {
  const list: BreadcrumbItem = {
    label: 'Exercises',
    to: exerciseListLocation(input.workflowStatus),
  }
  if (input.snapshot) {
    const crumbs: BreadcrumbItem[] = [
      list,
      {
        label: 'Submitted Exercise Details',
        to: { name: 'supervisor-submission', params: { id: input.exerciseId } },
      },
      {
        label: 'Exercise Snapshot',
        to: input.scenarioId
          ? { name: 'supervisor-exercise-snapshot', params: { id: input.exerciseId } }
          : undefined,
      },
    ]
    if (input.scenarioId) {
      crumbs.push({ label: input.scenarioLabel?.trim() || 'Scenario' })
    }
    return crumbs
  }

  const crumbs: BreadcrumbItem[] = [
    list,
    {
      label: 'Exercise',
      to: input.scenarioId
        ? { name: 'supervisor-exercise-detail', params: { id: input.exerciseId } }
        : undefined,
    },
  ]
  if (input.scenarioId) {
    crumbs.push({ label: input.scenarioLabel?.trim() || 'Scenario' })
  }
  return crumbs
}

export function submittedDetailsBreadcrumbs(input: {
  approver: boolean
  workflowStatus?: string | null
  queueTab?: unknown
  workspaceMode?: string | null
}): BreadcrumbItem[] {
  if (input.approver) {
    return [
      {
        label: 'Approval Queue',
        to: approvalQueueLocation(input.queueTab, input.workspaceMode),
      },
      { label: 'Submission Review' },
    ]
  }
  return [
    { label: 'Exercises', to: exerciseListLocation(input.workflowStatus) },
    { label: 'Submitted Exercise Details' },
  ]
}

/** Puts the role landing page first. `homePath` comes from the signed-in roles. */
export function withHomeCrumb(trail: BreadcrumbItem[], homePath: string): BreadcrumbItem[] {
  if (trail[0]?.label === 'Home') return trail
  return [{ label: 'Home', to: homePath }, ...trail]
}

/** Route trail. Top-level screens are a single current-page crumb. */
export function breadcrumbsForRoute(route: CrumbRoute): BreadcrumbItem[] {
  const name = typeof route.name === 'string' ? route.name : ''
  const exerciseId = param(route, 'id')
  const scenarioId = param(route, 'scenarioId') || null

  switch (name) {
    case 'agent-session-detail':
      return [
        { label: 'My TMS', to: { name: 'agent-session' } },
        { label: 'TMS Session Detail' },
      ]
    case 'supervisor-session-detail':
      return [
        { label: 'Team TMS', to: { name: 'supervisor-sessions' } },
        { label: 'TMS Session Detail' },
      ]
    case 'supervisor-toolkit-new':
      return [
        { label: 'Toolkits', to: { name: 'supervisor-toolkits' } },
        { label: 'Add Toolkit' },
      ]
    case 'supervisor-toolkit-edit':
      return [
        { label: 'Toolkits', to: { name: 'supervisor-toolkits' } },
        { label: 'Edit Toolkit' },
      ]
    case 'supervisor-exercise-detail':
    case 'supervisor-scenario-form':
      return exerciseDetailBreadcrumbs({
        exerciseId,
        snapshot: false,
        scenarioId: name === 'supervisor-scenario-form' ? scenarioId : null,
      })
    case 'supervisor-exercise-snapshot':
    case 'supervisor-scenario-snapshot':
      return exerciseDetailBreadcrumbs({
        exerciseId,
        snapshot: true,
        scenarioId: name === 'supervisor-scenario-snapshot' ? scenarioId : null,
      })
    case 'supervisor-submission':
      return submittedDetailsBreadcrumbs({ approver: false })
    case 'approver-review':
      return submittedDetailsBreadcrumbs({
        approver: true,
        queueTab: route.query?.tab,
      })
    default: {
      const title = route.meta?.title
      return typeof title === 'string' && title.trim() ? [{ label: title.trim() }] : []
    }
  }
}
