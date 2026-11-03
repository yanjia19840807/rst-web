import { describe, expect, it } from 'vitest'

import { assignmentConflict } from '../assignment'

const groups = [
  { id: 'a', name: 'North', countries: ['France', 'China'] },
  { id: 'b', name: 'South', countries: ['Japan'] },
]

describe('assignmentConflict', () => {
  it('names the group that already owns the country', () => {
    expect(assignmentConflict(groups, null, ['Japan'], 'region')).toBe(
      'Japan is already assigned to region South.',
    )
  })

  it('ignores the group being edited', () => {
    expect(assignmentConflict(groups, 'a', ['France'], 'cluster')).toBeNull()
  })
})
