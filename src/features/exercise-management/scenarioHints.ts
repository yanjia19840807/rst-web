export const RIGHT_SIZING_HC_HINT =
  'Target headcount this scenario simulates. Charts and Results compare the Exercise baseline against this HC.'

export const MONTHLY_VOLUME_OT_HINT =
  'Monthly actual and forecast volume against overtime and HC bands at the Right Sizing HC. Use it to see which months need overtime or sit over capacity.'

export const DAILY_BACKLOG_AGING_HINT =
  'Daily volume and backlog aging across the full daily window. Points above SLA Turntime are KO.'

export const MONTHLY_SLA_GOAL_HINT =
  'Share of working days each month whose backlog aging stays within SLA Turntime, compared with the Team Setup SLA target.'

export const SHIFT_INPUTS_HINT =
  'Define shifts that cover the Slot Period from Volume. Run simulation to compare available FTE with theoretical FTE needed per slot.'

export const SHIFT_INPUT_HINT_LINES = [
  { label: 'Start', note: 'clock time', value: 'When this shift begins.' },
  { label: 'Duration', note: 'hours', value: 'How long this shift lasts.' },
  { label: 'Capacity FTE', note: 'headcount', value: 'FTE assigned to this shift.' },
  { label: 'Team Weekend', note: 'weekend pattern', value: 'Which days this shift treats as weekend.' },
]

export const SLOT_FTE_CHART_HINT =
  'Stacked bars are FTE available from each shift. The dashed line is theoretical FTE needed from Per-slot volume and cycle time. TAT lines show whether coverage stays on target through the day.'
