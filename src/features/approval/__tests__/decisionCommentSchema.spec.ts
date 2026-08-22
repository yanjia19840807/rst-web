import { describe, expect, it } from 'vitest'

import {
  decisionCommentSchema,
  emptyDecisionComment,
  returnCommentSchema,
} from '../schemas/decisionComment'

describe('decisionCommentSchema', () => {
  it('accepts an empty optional comment', () => {
    expect(decisionCommentSchema.safeParse(emptyDecisionComment()).success).toBe(true)
  })

  it('rejects a comment longer than 2000 characters', () => {
    const result = decisionCommentSchema.safeParse({ comments: 'x'.repeat(2001) })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'comments')).toBe(true)
  })
})

describe('returnCommentSchema', () => {
  it('requires a comment when returning', () => {
    const result = returnCommentSchema.safeParse({ comments: '   ' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'comments')).toBe(true)
  })

  it('accepts a non-empty return comment', () => {
    expect(returnCommentSchema.safeParse({ comments: 'Please revisit HC.' }).success).toBe(true)
  })
})
