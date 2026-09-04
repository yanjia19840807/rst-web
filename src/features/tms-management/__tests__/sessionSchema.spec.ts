import { describe, expect, it } from 'vitest'

import { createSessionSchema } from '../schemas/session'

describe('createSessionSchema volume', () => {
  const schema = createSessionSchema(false)

  it('accepts a whole number of at least 1', () => {
    expect(
      schema.safeParse({
        toolkitId: 'tk-1',
        processedVolume: 12,
        reference: '',
        remarks: '',
      }).success,
    ).toBe(true)
  })

  it('rejects a decimal volume', () => {
    const result = schema.safeParse({
      toolkitId: 'tk-1',
      processedVolume: 1.5,
      reference: '',
      remarks: '',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'processedVolume')).toBe(
      true,
    )
  })

  it('rejects a volume below 1', () => {
    const result = schema.safeParse({
      toolkitId: 'tk-1',
      processedVolume: 0,
      reference: '',
      remarks: '',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'processedVolume')).toBe(
      true,
    )
  })
})
