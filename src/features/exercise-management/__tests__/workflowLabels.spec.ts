import { describe, expect, it } from 'vitest'

import {
  currentStepLabel,
  exerciseListBackLabel,
  exerciseListLocation,
  exerciseListTabQuery,
  isReturned,
  reviewStageQueryValue,
  SUPERVISOR_SIZING_STEP,
} from '../workflowLabels'

describe('currentStepLabel', () => {
  it('uses Supervisor Sizing before the first Submit and after Return / Withdraw', () => {
    expect(currentStepLabel({ workflowStatus: 'IN_PROGRESS' })).toBe(SUPERVISOR_SIZING_STEP)
    expect(currentStepLabel({ workflowStatus: 'IN_PROGRESS', requiredRole: 'MANAGER' })).toBe(
      SUPERVISOR_SIZING_STEP,
    )
  })

  it('uses the waiting review stage while Under Review', () => {
    expect(currentStepLabel({ workflowStatus: 'UNDER_REVIEW', requiredRole: 'MANAGER' })).toBe(
      'Manager Review',
    )
    expect(currentStepLabel({ workflowStatus: 'UNDER_REVIEW', requiredRole: 'CDH' })).toBe(
      'Center Delivery Head Review',
    )
    expect(currentStepLabel({ workflowStatus: 'UNDER_REVIEW', requiredRole: 'LTH' })).toBe(
      'Local Transformation Head Review',
    )
  })

  it('uses Approved on Archived exercises', () => {
    expect(currentStepLabel({ workflowStatus: 'APPROVED' })).toBe('Approved')
  })
})

describe('isReturned', () => {
  it('is a last-action flag, not a step', () => {
    expect(isReturned({ submissionStatus: 'RETURNED' })).toBe(true)
    expect(isReturned({ submissionStatus: 'OPEN' })).toBe(false)
    expect(isReturned({ workflowStatus: 'IN_PROGRESS' })).toBe(false)
  })
})

describe('exerciseListTabQuery', () => {
  it('keeps In Progress work and Under Review on the In Progress list', () => {
    expect(exerciseListTabQuery('IN_PROGRESS')).toBe('IN_PROGRESS')
    expect(exerciseListTabQuery('UNDER_REVIEW')).toBe('IN_PROGRESS')
    expect(exerciseListBackLabel('UNDER_REVIEW')).toBe('← Back to In Progress')
  })

  it('sends approved exercises back to Archived', () => {
    expect(exerciseListTabQuery('APPROVED')).toBe('ARCHIVED')
    expect(exerciseListLocation('APPROVED')).toEqual({
      name: 'supervisor-exercises',
      query: { tab: 'ARCHIVED' },
    })
    expect(exerciseListBackLabel('APPROVED')).toBe('← Back to Archived')
  })
})

describe('reviewStageQueryValue', () => {
  it('maps Supervisor Sizing to SUPERVISOR', () => {
    expect(reviewStageQueryValue(SUPERVISOR_SIZING_STEP)).toBe('SUPERVISOR')
    expect(reviewStageQueryValue('All stages')).toBeUndefined()
  })
})
