import { toast } from 'vue-sonner'

import { ApiError } from '@/api/client'

/**
 * Inputs the user can still fill in. These block sizing, slot simulation, Official,
 * or Submit, but they are not a failed request.
 */
const MISSING_INPUT_CODES = new Set([
  'cycle-time-required',
  'team-setup-required',
  'sizing-input-required',
  'right-sizing-hc-required',
  'sizing-results-required',
  'sizing-hc-mismatch',
  'sizing-workdays-zero',
  'forecast-sizing-actual-required',
  'forecast-history-empty',
  'forecast-daily-train-end-actual-required',
  'forecast-daily-future-empty',
  'forecast-points-empty',
  'slot-volume-required',
  'slot-duration-invalid',
  'shifts-required',
  'shift-limit-exceeded',
  'shift-start-required',
  'shift-duration-invalid',
  'shift-headcount-invalid',
  'invalid-weekend-code',
  'invalid-availability-ratio',
  'invalid-cycle-time',
  'official-scenario-required',
])

export function isMissingInputProblem(error: unknown): boolean {
  return error instanceof ApiError && error.code != null && MISSING_INPUT_CODES.has(error.code)
}

export function toastProblem(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  if (isMissingInputProblem(error)) {
    toast.warning(message)
    return
  }
  toast.error(message)
}
