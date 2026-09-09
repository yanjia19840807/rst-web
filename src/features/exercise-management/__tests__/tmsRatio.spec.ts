import { describe, expect, it } from 'vitest'

import { computeTmsRatio, formatTmsRatioPercent, TMS_RATIO_REASONS, tmsRatioLabel } from '../tmsRatio'
import type { DailyVolume, ExerciseTmsSession } from '../types'

function daily(volumeDate: string, actualVolume: number | null): DailyVolume {
  return {
    id: volumeDate,
    volumeDate,
    actualVolume,
    dailyAdjustmentRatio: null,
    sourceType: 'MANUAL',
  }
}

function session(processedVolume: number, included = true): ExerciseTmsSession {
  return {
    sessionNo: `TMS-${processedVolume}`,
    reference: '',
    agentName: 'Agent',
    toolkitName: 'Toolkit',
    subtaskName: 'Subtask',
    processedVolume,
    netDurationSeconds: 100,
    remarks: null,
    cycleTimeSeconds: 10,
    zScore: 0,
    included,
    exclusionReason: null,
    startedAt: '2026-08-01T09:00:00Z',
    endedAt: '2026-08-01T09:02:00Z',
  }
}

describe('computeTmsRatio', () => {
  it('requires every TMS period date to have Daily actuals', () => {
    const result = computeTmsRatio({
      tmsFrom: '2026-08-01',
      tmsTo: '2026-08-03',
      daily: [daily('2026-08-01', 10), daily('2026-08-03', 10)],
      sessions: [session(12)],
    })
    expect(result?.reason).toBe(TMS_RATIO_REASONS.incompleteCoverage)
    expect(result?.ratio).toBeNull()
    expect(result?.missingDateCount).toBe(1)
    expect(tmsRatioLabel(result)).toBe('—')
  })

  it('treats zero Daily actual as present data', () => {
    const result = computeTmsRatio({
      tmsFrom: '2026-08-01',
      tmsTo: '2026-08-02',
      daily: [daily('2026-08-01', 20), daily('2026-08-02', 0)],
      sessions: [session(16)],
    })
    expect(result?.reason).toBe(TMS_RATIO_REASONS.ok)
    expect(result?.ratio).toBe(0.8)
  })

  it('warns when the ratio is below 80%', () => {
    const result = computeTmsRatio({
      tmsFrom: '2026-08-01',
      tmsTo: '2026-08-01',
      daily: [daily('2026-08-01', 100)],
      sessions: [session(50), session(10, false)],
    })
    expect(result?.reason).toBe(TMS_RATIO_REASONS.belowThreshold)
    expect(result?.tmsVolumeSum).toBe(50)
    expect(result?.ratio).toBe(0.5)
    expect(formatTmsRatioPercent(result?.ratio)).toBe('50.00%')
    expect(formatTmsRatioPercent(0.0148)).toBe('1.48%')
    expect(tmsRatioLabel(result)).toBe('50.00%')
  })
})
