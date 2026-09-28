import { describe, expect, it } from 'vitest'

import {
  breadcrumbsForRoute,
  exerciseDetailBreadcrumbs,
  submittedDetailsBreadcrumbs,
  withHomeCrumb,
} from '../breadcrumbs'

describe('withHomeCrumb', () => {
  it('links Home to the role landing page', () => {
    expect(withHomeCrumb([{ label: 'Exercises' }], '/approver/queue')).toEqual([
      { label: 'Home', to: '/approver/queue' },
      { label: 'Exercises' },
    ])
  })

  it('leaves a trail that already starts at Home unchanged', () => {
    const trail = [{ label: 'Home', to: '/supervisor/toolkits' }, { label: 'Toolkits' }]
    expect(withHomeCrumb(trail, '/agent/session')).toEqual(trail)
  })
})

describe('breadcrumbsForRoute', () => {
  it('uses the page title when the route is a top-level screen', () => {
    expect(
      breadcrumbsForRoute({
        name: 'supervisor-exercises',
        meta: { title: 'Exercises' },
      }),
    ).toEqual([{ label: 'Exercises' }])
  })

  it('links session detail back to the list that owns it', () => {
    expect(breadcrumbsForRoute({ name: 'agent-session-detail' })).toEqual([
      { label: 'My TMS', to: { name: 'agent-session' } },
      { label: 'TMS Session Detail' },
    ])
    expect(breadcrumbsForRoute({ name: 'supervisor-session-detail' })).toEqual([
      { label: 'Team TMS', to: { name: 'supervisor-sessions' } },
      { label: 'TMS Session Detail' },
    ])
  })

  it('links toolkit forms back to the toolkit list', () => {
    expect(breadcrumbsForRoute({ name: 'supervisor-toolkit-edit' })).toEqual([
      { label: 'Toolkits', to: { name: 'supervisor-toolkits' } },
      { label: 'Edit Toolkit' },
    ])
  })
})

describe('exerciseDetailBreadcrumbs', () => {
  it('keeps the list tab that matches the exercise status', () => {
    expect(
      exerciseDetailBreadcrumbs({
        exerciseId: 'ex-1',
        snapshot: false,
        workflowStatus: 'APPROVED',
      }),
    ).toEqual([
      { label: 'Exercises', to: { name: 'supervisor-exercises', query: { tab: 'VALIDATED' } } },
      { label: 'Exercise' },
    ])
  })

  it('inserts the scenario under the exercise', () => {
    expect(
      exerciseDetailBreadcrumbs({
        exerciseId: 'ex-1',
        snapshot: false,
        scenarioId: 'sc-1',
        scenarioLabel: 'Peak week',
      }).map((item) => item.label),
    ).toEqual(['Exercises', 'Exercise', 'Peak week'])
  })

  it('returns a snapshot through submitted details', () => {
    expect(
      exerciseDetailBreadcrumbs({
        exerciseId: 'ex-1',
        snapshot: true,
      }).map((item) => item.label),
    ).toEqual(['Exercises', 'Submitted Exercise Details', 'Exercise Snapshot'])
  })
})

describe('submittedDetailsBreadcrumbs', () => {
  it('follows the approval queue tab that opened the review', () => {
    expect(
      submittedDetailsBreadcrumbs({
        approver: true,
        queueTab: 'COMPLETED',
        workspaceMode: 'COMPLETED',
      }),
    ).toEqual([
      { label: 'Approval Queue', to: { name: 'approver-queue', query: { tab: 'COMPLETED' } } },
      { label: 'Submission Review' },
    ])
  })
})
