import { describe, expect, it } from 'vitest'

import { emptyToolkitForm, toolkitEditorSchema } from '../schemas/toolkit'

function validForm() {
  return {
    ...emptyToolkitForm('Kuala Lumpur'),
    name: 'Bank Rec Manual Check',
    supervisorPositionId: 'POS-SUP-001',
    domain: 'Finance',
    pl1: 'Accounting',
    pl2: 'Record to Report',
    pl3Code: 'PL3-BANK-REC',
    pl3Name: 'Bank Reconciliation',
    sharedKpiSelections: [
      { carrier: 'CMA CGM', site: 'Sydney', customerCountry: 'Australia' },
    ],
  }
}

describe('toolkitEditorSchema', () => {
  it('accepts a complete toolkit payload', () => {
    expect(toolkitEditorSchema.safeParse(validForm()).success).toBe(true)
  })

  it('requires a name, hierarchy, and at least one Shared KPI', () => {
    const blank = toolkitEditorSchema.safeParse(emptyToolkitForm())
    expect(blank.success).toBe(false)
    if (blank.success) return
    const paths = blank.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('name')
    expect(paths).toContain('supervisorPositionId')
    expect(paths).toContain('sharedKpiSelections')
  })

  it('accepts null descriptions from the API', () => {
    const result = toolkitEditorSchema.safeParse({
      ...validForm(),
      description: null,
      subtasks: [
        {
          id: 'sub-1',
          name: 'Review',
          description: null,
          displayOrder: 1,
          deletedAt: null,
        },
      ],
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.description).toBe('')
    expect(result.data.subtasks[0]?.description).toBe('')
  })
})
