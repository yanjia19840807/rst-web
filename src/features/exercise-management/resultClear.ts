export type ResultClearScope = 'SLOT' | 'DAILY' | 'MONTHLY' | 'SIZING' | 'SUPPORT' | 'ALL'

export type SimForgetTarget =
  | { kind: 'monthly' | 'daily' | 'slot' }
  | { kind: 'forecast'; level: 'MONTHLY' | 'DAILY' }

const EFFECTS: Record<ResultClearScope, { clears: string; keeps: string }> = {
  SLOT: {
    clears: 'saved Slot Simulation',
    keeps: 'Monthly and Daily forecast and sizing stay.',
  },
  DAILY: {
    clears: 'saved Daily forecast and Daily sizing',
    keeps: 'Monthly forecast, Monthly sizing, and Slot simulation stay.',
  },
  MONTHLY: {
    clears: 'saved Monthly forecast, Monthly sizing, and Daily sizing',
    keeps: 'Daily forecast and Slot simulation stay.',
  },
  SIZING: {
    clears: 'saved Monthly and Daily forecast and sizing',
    keeps: 'Slot simulation stays.',
  },
  SUPPORT: {
    clears: 'saved Monthly sizing',
    keeps: 'Forecasts, Daily sizing, and Slot simulation stay.',
  },
  ALL: {
    clears: 'saved Monthly and Daily forecast and sizing, and Slot simulation',
    keeps: 'Scenario inputs (name, Right Sizing HC, shifts) stay.',
  },
}

export function resultClearPrompt(scope: ResultClearScope, action: string) {
  const effect = EFFECTS[scope]
  const keeps =
    scope === 'ALL'
      ? effect.keeps
      : `${effect.keeps} Scenario inputs (name, Right Sizing HC, shifts) stay.`
  return {
    title: 'Clear saved results?',
    description: `${action} will clear ${effect.clears} on all scenarios. ${keeps}`,
  }
}

export function forgetTargets(scope: ResultClearScope): SimForgetTarget[] {
  switch (scope) {
    case 'SLOT':
      return [{ kind: 'slot' }]
    case 'DAILY':
      return [{ kind: 'daily' }, { kind: 'forecast', level: 'DAILY' }]
    case 'MONTHLY':
      return [
        { kind: 'monthly' },
        { kind: 'daily' },
        { kind: 'forecast', level: 'MONTHLY' },
      ]
    case 'SIZING':
      return [
        { kind: 'monthly' },
        { kind: 'daily' },
        { kind: 'forecast', level: 'MONTHLY' },
        { kind: 'forecast', level: 'DAILY' },
      ]
    case 'SUPPORT':
      return [{ kind: 'monthly' }]
    case 'ALL':
      return [
        { kind: 'monthly' },
        { kind: 'daily' },
        { kind: 'slot' },
        { kind: 'forecast', level: 'MONTHLY' },
        { kind: 'forecast', level: 'DAILY' },
      ]
  }
}

/** Matches ResultClearScope.notice and the previous unscoped sentences. */
export function scopeFromClearNotice(notice: string): ResultClearScope | null {
  if (notice.startsWith('Cleared saved Slot Simulation for ')) return 'SLOT'
  if (notice.startsWith('Cleared saved Slot Simulation results for ')) return 'SLOT'
  if (notice.startsWith('Cleared saved Daily forecast and Daily sizing for ')) return 'DAILY'
  if (
    notice.startsWith('Cleared saved Monthly forecast, Monthly sizing, and Daily sizing for ')
  ) {
    return 'MONTHLY'
  }
  if (
    notice.startsWith(
      'Cleared saved Monthly and Daily forecast and sizing, and Slot simulation for ',
    )
  ) {
    return 'ALL'
  }
  if (notice.startsWith('Cleared saved Monthly and Daily forecast and sizing for ')) return 'SIZING'
  if (notice.startsWith('Cleared saved Monthly sizing for ')) return 'SUPPORT'
  if (notice.startsWith('Cleared saved Forecast and Simulation results for ')) return 'ALL'
  return null
}
