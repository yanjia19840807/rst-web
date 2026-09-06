import { describe, expect, it } from 'vitest'

import { isAgentWorkspace, menuItems } from '../menu'

describe('isAgentWorkspace', () => {
  it('is true when every visible item is an agent TMS route', () => {
    const agentItems = menuItems.filter((item) => item.to.startsWith('/agent/'))
    expect(isAgentWorkspace(agentItems)).toBe(true)
  })

  it('is false when the user also has other modules', () => {
    expect(isAgentWorkspace(menuItems)).toBe(false)
    expect(isAgentWorkspace([])).toBe(false)
  })
})
