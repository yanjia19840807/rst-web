import { describe, expect, it } from 'vitest'

import {
  forgetTargets,
  resultClearPrompt,
  scopeFromClearNotice,
  type ResultClearScope,
} from '../resultClear'

const NOTICES: Record<ResultClearScope, string> = {
  SLOT: 'Cleared saved Slot Simulation for 1 scenario(s).',
  DAILY:
    'Cleared saved Daily forecast and Daily sizing for 1 scenario(s). Monthly forecast, Monthly sizing, and Slot simulation were kept.',
  MONTHLY:
    'Cleared saved Monthly forecast, Monthly sizing, and Daily sizing for 1 scenario(s). Daily forecast and Slot simulation were kept.',
  SIZING:
    'Cleared saved Monthly and Daily forecast and sizing for 1 scenario(s). Slot simulation was kept.',
  SUPPORT:
    'Cleared saved Monthly sizing for 1 scenario(s). Forecasts, Daily sizing, and Slot simulation were kept.',
  ALL: 'Cleared saved Monthly and Daily forecast and sizing, and Slot simulation for 1 scenario(s).',
}

describe('result clear prompts', () => {
  it('names the results each edit clears and the results it keeps', () => {
    expect(resultClearPrompt('SLOT', 'Saving Per-slot Volume').description).toBe(
      'Saving Per-slot Volume will clear saved Slot Simulation on all scenarios. Monthly and Daily forecast and sizing stay. Scenario inputs (name, Right Sizing HC, shifts) stay.',
    )
    expect(resultClearPrompt('DAILY', 'Saving Daily Volume').description).toContain(
      'Daily forecast and Daily sizing',
    )
    expect(resultClearPrompt('DAILY', 'Deleting Daily Volume').description).toContain(
      'Monthly forecast, Monthly sizing, and Slot simulation stay.',
    )
    expect(resultClearPrompt('MONTHLY', 'Saving Monthly Volume').description).toContain(
      'Monthly forecast, Monthly sizing, and Daily sizing',
    )
    expect(resultClearPrompt('MONTHLY', 'Importing Monthly Volume').description).toContain(
      'Daily forecast and Slot simulation stay.',
    )
    expect(resultClearPrompt('SIZING', 'Saving Calendar').description).toContain(
      'Slot simulation stays.',
    )
    expect(resultClearPrompt('SUPPORT', 'Saving Production Support').description).toContain(
      'Forecasts, Daily sizing, and Slot simulation stay.',
    )
    expect(resultClearPrompt('ALL', 'Saving Team Setup').description).toContain(
      'Monthly and Daily forecast and sizing, and Slot simulation',
    )
    expect(resultClearPrompt('ALL', 'Saving the Cycle Time median').description).toContain(
      'Scenario inputs (name, Right Sizing HC, shifts) stay.',
    )
  })
})

describe('result clear cache targets', () => {
  it('forgets only the charts that scope deletes', () => {
    expect(forgetTargets('SLOT')).toEqual([{ kind: 'slot' }])
    expect(forgetTargets('DAILY')).toEqual([
      { kind: 'daily' },
      { kind: 'forecast', level: 'DAILY' },
    ])
    expect(forgetTargets('MONTHLY')).toEqual([
      { kind: 'monthly' },
      { kind: 'daily' },
      { kind: 'forecast', level: 'MONTHLY' },
    ])
    expect(forgetTargets('SIZING').map((target) => target.kind)).toEqual([
      'monthly',
      'daily',
      'forecast',
      'forecast',
    ])
    expect(forgetTargets('SUPPORT')).toEqual([{ kind: 'monthly' }])
    expect(forgetTargets('ALL').some((target) => target.kind === 'slot')).toBe(true)
  })

  it('reads the server notice back into the same scope', () => {
    for (const [scope, notice] of Object.entries(NOTICES)) {
      expect(scopeFromClearNotice(notice)).toBe(scope)
    }
    expect(
      scopeFromClearNotice('Cleared saved Forecast and Simulation results for 1 scenario(s).'),
    ).toBe('ALL')
    expect(scopeFromClearNotice('Per-slot Volume grid generated.')).toBeNull()
  })
})
