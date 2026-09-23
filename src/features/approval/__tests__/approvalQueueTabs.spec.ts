import { describe, expect, it } from 'vitest'

import { approvalQueueVisibility } from '../components/approvalQueueColumns'
import {
  AWAITING_REVIEW_TAB,
  COMPLETED_TASK_TAB,
  approvalQueueBackLabel,
  approvalQueueLocation,
  approvalQueueTabFromQuery,
  approvalQueueTabQuery,
  approvalQueueTabQueryFromReview,
} from '../approvalQueueTabs'

describe('approvalQueueTabs', () => {
  it('maps query values to list tabs', () => {
    expect(approvalQueueTabFromQuery('COMPLETED')).toBe(COMPLETED_TASK_TAB)
    expect(approvalQueueTabFromQuery('AWAITING')).toBe(AWAITING_REVIEW_TAB)
    expect(approvalQueueTabFromQuery(undefined)).toBe(AWAITING_REVIEW_TAB)
    expect(approvalQueueTabQuery(COMPLETED_TASK_TAB)).toBe('COMPLETED')
  })

  it('keeps the entry tab even after the workspace becomes completed', () => {
    expect(approvalQueueTabQueryFromReview('AWAITING', 'COMPLETED')).toBe('AWAITING')
    expect(approvalQueueLocation('AWAITING', 'COMPLETED')).toEqual({
      name: 'approver-queue',
      query: { tab: 'AWAITING' },
    })
    expect(approvalQueueBackLabel('AWAITING', 'COMPLETED')).toBe(
      '← Back to Awaiting Review',
    )
  })

  it('returns to Completed Task when that list opened the review', () => {
    expect(approvalQueueLocation('COMPLETED', 'COMPLETED')).toEqual({
      name: 'approver-queue',
      query: { tab: 'COMPLETED' },
    })
    expect(approvalQueueBackLabel('COMPLETED')).toBe('← Back to Completed Task')
  })

  it('falls back to the workspace when the review URL has no tab', () => {
    expect(approvalQueueTabQueryFromReview(undefined, 'COMPLETED')).toBe('COMPLETED')
    expect(approvalQueueTabQueryFromReview(undefined, 'IN_PROGRESS')).toBe('AWAITING')
  })

  it('shows Handler on Completed Task and Previous Actor on Awaiting Review', () => {
    expect(approvalQueueVisibility(AWAITING_REVIEW_TAB)).toMatchObject({
      previousActor: true,
      actedBy: false,
    })
    expect(approvalQueueVisibility(COMPLETED_TASK_TAB)).toMatchObject({
      previousActor: false,
      actedBy: true,
    })
  })
})
