import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client'
import { isMissingInputProblem } from '@/api/problemSeverity'

describe('isMissingInputProblem', () => {
  it('treats missing sizing inputs as warnings', () => {
    expect(
      isMissingInputProblem(
        new ApiError(
          'Set a Cycle Time median in Associated Data → TMS before sizing. Apply a TMS period, or enter a manual median. (cycle-time-required)',
          422,
          'cycle-time-required',
        ),
      ),
    ).toBe(true)
    expect(
      isMissingInputProblem(
        new ApiError(
          'Complete Team Setup in Associated Data before sizing. (team-setup-required)',
          422,
          'team-setup-required',
        ),
      ),
    ).toBe(true)
    expect(
      isMissingInputProblem(
        new ApiError(
          'Enter Actual Volume for the sizing month in Associated Data → Volume Input → Monthly before forecast. (forecast-sizing-actual-required)',
          422,
          'forecast-sizing-actual-required',
        ),
      ),
    ).toBe(true)
  })

  it('keeps failed requests as errors', () => {
    expect(
      isMissingInputProblem(
        new ApiError('Forecast service is unreachable. (forecast-service-unreachable)', 502, 'forecast-service-unreachable'),
      ),
    ).toBe(false)
    expect(
      isMissingInputProblem(
        new ApiError('Simulations can only run against a live scenario. (scenario-not-editable)', 409, 'scenario-not-editable'),
      ),
    ).toBe(false)
    expect(isMissingInputProblem(new Error('Sizing simulation failed.'))).toBe(false)
  })
})
