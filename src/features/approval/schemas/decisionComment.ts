import { z } from 'zod'

const commentField = z
  .string()
  .max(2000, 'Comment must be 2000 characters or fewer.')

export const decisionCommentSchema = z.object({
  comments: commentField,
})

export const returnCommentSchema = z.object({
  comments: commentField.trim().min(1, 'Comment is required when returning a submission.'),
})

export type DecisionCommentValues = z.infer<typeof decisionCommentSchema>

export function emptyDecisionComment(): DecisionCommentValues {
  return { comments: '' }
}
