import type { CycleTimeBaseline, DailyVolume, ExerciseTmsSession, TmsRatio } from './types'

export const TMS_RATIO_THRESHOLD = 0.8

export const TMS_RATIO_REASONS = {
  ok: 'ok',
  incompleteCoverage: 'incomplete-coverage',
  belowThreshold: 'below-threshold',
  dailyVolumeZero: 'daily-volume-zero',
} as const

const MISSING_DATES_LIMIT = 8

export function computeTmsRatio(input: {
  tmsFrom: string | null | undefined
  tmsTo: string | null | undefined
  daily: DailyVolume[]
  sessions: ExerciseTmsSession[]
}): TmsRatio | null {
  const from = input.tmsFrom
  const to = input.tmsTo
  if (!from || !to || to < from) return null

  const datesWithData = new Set<string>()
  let dailyVolumeSum = 0
  for (const row of input.daily) {
    if (row.actualVolume == null || !row.volumeDate) continue
    if (row.volumeDate < from || row.volumeDate > to) continue
    datesWithData.add(row.volumeDate)
    dailyVolumeSum += Number(row.actualVolume)
  }

  const missingDates: string[] = []
  let missingDateCount = 0
  for (let date = from; date <= to; date = nextIsoDate(date)) {
    if (datesWithData.has(date)) continue
    missingDateCount++
    if (missingDates.length < MISSING_DATES_LIMIT) missingDates.push(date)
  }

  const tmsVolumeSum = input.sessions
    .filter((session) => session.included)
    .reduce((sum, session) => sum + (session.processedVolume == null ? 0 : Number(session.processedVolume)), 0)

  if (missingDateCount > 0) {
    return {
      reason: TMS_RATIO_REASONS.incompleteCoverage,
      ratio: null,
      tmsVolumeSum,
      dailyVolumeSum,
      missingDateCount,
      threshold: TMS_RATIO_THRESHOLD,
    }
  }
  if (dailyVolumeSum === 0) {
    return {
      reason: TMS_RATIO_REASONS.dailyVolumeZero,
      ratio: null,
      tmsVolumeSum,
      dailyVolumeSum,
      missingDateCount: 0,
      threshold: TMS_RATIO_THRESHOLD,
    }
  }
  const ratio = tmsVolumeSum / dailyVolumeSum
  return {
    reason: ratio < TMS_RATIO_THRESHOLD ? TMS_RATIO_REASONS.belowThreshold : TMS_RATIO_REASONS.ok,
    ratio,
    tmsVolumeSum,
    dailyVolumeSum,
    missingDateCount: 0,
    threshold: TMS_RATIO_THRESHOLD,
  }
}

export function attachSystemTmsRatio(
  baseline: CycleTimeBaseline | null | undefined,
  input: Parameters<typeof computeTmsRatio>[0],
): CycleTimeBaseline | null {
  if (!baseline) return null
  if (baseline.baselineType?.toUpperCase() !== 'SYSTEM') {
    return { ...baseline, tmsRatio: null }
  }
  return { ...baseline, tmsRatio: computeTmsRatio(input) }
}

export function formatTmsRatioPercent(ratio: number | string | null | undefined): string {
  if (ratio == null || ratio === '') return '—'
  const percent = Math.round(Number(ratio) * 10000) / 100
  if (!Number.isFinite(percent)) return '—'
  return `${percent.toFixed(2)}%`
}

export function tmsRatioLabel(ratio: TmsRatio | null | undefined): string {
  return formatTmsRatioPercent(ratio?.ratio)
}

export function tmsRatioDescription(ratio: TmsRatio | null | undefined): string {
  if (!ratio) {
    return 'Sum of included TMS volume ÷ sum of Daily volume in the TMS period'
  }
  if (ratio.reason === TMS_RATIO_REASONS.incompleteCoverage) {
    const days = ratio.missingDateCount
    return `Daily volume is missing for ${days} day${days === 1 ? '' : 's'} in the TMS period`
  }
  if (ratio.reason === TMS_RATIO_REASONS.dailyVolumeZero) {
    return 'Daily volume in the TMS period sums to 0, so the ratio cannot be computed'
  }
  if (ratio.reason === TMS_RATIO_REASONS.belowThreshold) {
    return 'Below the 80% warning threshold (included TMS volume ÷ Daily volume)'
  }
  return 'Sum of included TMS volume ÷ sum of Daily volume in the TMS period'
}

function nextIsoDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
