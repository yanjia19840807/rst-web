import { isVNode } from 'vue'
import { describe, expect, it } from 'vitest'

import { routes } from '@/router/routes'

import { exerciseNoLink, reportSourceFrom, reportSubmissionLocation } from '../reportSubmission'

describe('report submission links', () => {
  it('opens Submission Review under the list that linked it', () => {
    expect(reportSubmissionLocation('repository', 'sub-1')).toEqual({
      name: 'approver-repository-submission',
      params: { submissionId: 'sub-1' },
    })
    expect(reportSubmissionLocation('support', 'sub-2')).toEqual({
      name: 'approver-support-submission',
      params: { submissionId: 'sub-2' },
    })
    expect(reportSubmissionLocation('validation', 'sub-3')).toEqual({
      name: 'approver-validation-submission',
      params: { submissionId: 'sub-3' },
    })
  })

  it('registers a read-only review route for each list', () => {
    const byName = new Map(routes.map((route) => [route.name, route]))
    expect(byName.get('approver-repository-submission')?.meta).toMatchObject({
      reportSource: 'repository',
      roles: ['approver', 'ho'],
    })
    expect(byName.get('approver-support-submission')?.meta).toMatchObject({
      reportSource: 'support',
    })
    expect(byName.get('approver-validation-submission')?.meta).toMatchObject({
      reportSource: 'validation',
      roles: ['approver'],
    })
    expect(reportSourceFrom('repository')).toBe('repository')
    expect(reportSourceFrom('queue')).toBeNull()
  })
})

describe('exerciseNoLink', () => {
  it('links the exercise number to that list’s submission review', () => {
    const link = exerciseNoLink('support', 'RST-Q3-001', 'sub-1')
    expect(isVNode(link)).toBe(true)
    if (!isVNode(link)) return
    expect(link.props).toMatchObject({
      to: { name: 'approver-support-submission', params: { submissionId: 'sub-1' } },
      title: 'View RST-Q3-001',
    })
  })

  it('stays plain text when the row has no submission id', () => {
    expect(exerciseNoLink('repository', 'RST-Q3-002', '  ')).toBe('RST-Q3-002')
    expect(exerciseNoLink('validation', '', null)).toBe('—')
  })
})
