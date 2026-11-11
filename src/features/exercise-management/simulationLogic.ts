export type LogicSource = {
  symbol: string
  source: string
  rule: string
}

export type LogicFormula = {
  title?: string
  text: string
}

export type LogicSection = {
  id: string
  nav: string
  title: string
  group: 'results' | 'charts'
  note?: string
  sources: LogicSource[]
  formulas: LogicFormula[]
  remarks: string[]
}

export type SimulationLogic = {
  title: string
  summary: string
  sections: LogicSection[]
}

function block(title: string | undefined, ...lines: string[]): LogicFormula {
  return title ? { title, text: lines.join('\n') } : { text: lines.join('\n') }
}

const SIZING_CAPACITY: LogicSection = {
  id: 'sizing-capacity',
  nav: 'Capacity Creation',
  title: 'Capacity Creation',
  group: 'results',
  note: 'Headline metric shown in Results. A positive value indicates potential capacity released compared with the current Delivery HC.',
  sources: [
    {
      symbol: 'Actual size',
      source: 'Shared KPI',
      rule: 'Sum of Delivery HC from the selected Shared KPI lines. Tenure buckets are shown for reference only and are not included in the calculation.',
    },
    {
      symbol: 'Right size',
      source: 'Sizing Inputs',
      rule: 'The HC entered by the user for the scenario. This value remains constant across all simulated months.',
    },
    {
      symbol: 'Production support',
      source: 'Production Support',
      rule: 'Sum of Production Support FTE. If Production Support FTE cannot be calculated, Capacity Creation remains blank rather than being displayed as zero.',
    },
  ],
  formulas: [
    block(
      'Results',
      'Actual size = sum of Shared KPI Delivery HC',
      'Right size = Right Sizing HC',
      'Capacity Creation = Actual size − Right size − Production support',
    ),
    block(
      'Shared KPI lines (submitted view)',
      'Weight = line Delivery HC / Actual size',
      'Line Right size = Right size × Weight',
      'Line Capacity Creation = Capacity Creation × Weight',
    ),
  ],
  remarks: [],
}

const SIZING_NOMINAL: LogicSection = {
  id: 'sizing-nominal',
  nav: 'Nominal HC',
  title: 'Nominal HC (w/o OT)',
  group: 'results',
  note: 'The Results section displays the monthly sizing result for the selected sizing month. The same value is shown as "Max HC (No OT)" in the monthly chart.',
  sources: [
    {
      symbol: 'Volume',
      source: 'Monthly Volume',
      rule: 'For historical months, use Actual Volume. For forecast months, use the system-generated forecast value.',
    },
    { symbol: 'Commercial', source: 'Monthly Volume', rule: 'Commercial ratio for that month.' },
    { symbol: 'Automation', source: 'Team Setup', rule: 'Automation ratio.' },
    { symbol: 'Working Hours', source: 'Team Setup', rule: 'Working hours per day.' },
    { symbol: 'Availability', source: 'Team Setup', rule: 'Availability ratio.' },
    { symbol: 'Capacity', source: 'Team Setup', rule: 'Capacity ratio.' },
    { symbol: 'Cycle Time', source: 'Cycle Time', rule: 'Active baseline median, in seconds.' },
    { symbol: 'Work Days', source: 'Calendar and Holiday', rule: 'Working days in the month.' },
  ],
  formulas: [
    block(
      undefined,
      'Manual Volume = Volume × (1 − Automation) × (1 + Commercial)',
      'Nominal HC (w/o OT) = Manual Volume × Cycle Time / 3600 / (Work Days × Working Hours × Availability × Capacity)',
    ),
  ],
  remarks: [],
}

const SIZING_DAILY_RESULTS: LogicSection = {
  id: 'sizing-end-backlog',
  nav: 'Closing Backlog',
  title: 'Daily Simulation Period and Closing Backlog',
  group: 'results',
  note: 'The simulation starts on the first date with Daily Actual Volume. If no earlier Daily Actual Volume exists, it starts on 1 January of the sizing year. It ends on the final day of the month following the selected sizing month. Opening backlog on the first simulation day is zero. Dates with no volume remain in the simulation and are recorded with zero volume.',
  sources: [
    {
      symbol: 'Volume',
      source: 'Daily Volume',
      rule: 'Use Daily Actual Volume when available. Otherwise, use the applicable system-generated forecast value. If neither is available, use zero.',
    },
    { symbol: 'Daily Adj', source: 'Daily Volume', rule: 'Daily adjustment ratio.' },
    {
      symbol: 'Commercial',
      source: 'Monthly Volume',
      rule: "Commercial ratio of that day's month.",
    },
    { symbol: 'Automation', source: 'Team Setup', rule: 'Automation ratio.' },
    { symbol: 'Working Hours', source: 'Team Setup', rule: 'Working hours per day.' },
    { symbol: 'Availability', source: 'Team Setup', rule: 'Availability ratio.' },
    { symbol: 'Capacity', source: 'Team Setup', rule: 'Capacity ratio.' },
    { symbol: 'Max OT', source: 'Team Setup', rule: 'Max overtime, in minutes.' },
    { symbol: 'Weekend Shift HC', source: 'Team Setup', rule: 'Weekend shift headcount.' },
    { symbol: 'Skeleton', source: 'Team Setup', rule: 'Skeleton ratio.' },
    { symbol: 'Cycle Time', source: 'Cycle Time', rule: 'Active baseline median, in seconds.' },
    {
      symbol: 'Right size',
      source: 'Sizing Inputs',
      rule: 'Right Sizing HC. Used as on-duty headcount on working days.',
    },
  ],
  formulas: [
    block(
      'Daily Simulation Days',
      'Daily Simulation Days = Total number of calendar days in the simulation period.',
    ),
    block(
      'Manual Volume and on-duty HC',
      'Manual Volume = Volume × (1 − Automation) × (1 + Commercial) × (1 + Daily Adj)',
      'On duty = floor(Right size × Skeleton) on a holiday or a marked weekend',
      '        = Right size on a working day, including a Normal makeup day',
      '        = Weekend Shift HC on any other weekend',
    ),
    block(
      'Closing Backlog',
      'Standard = floor(On duty × Working Hours × 3600 × Availability × Capacity / Cycle Time)',
      'OT = floor(On duty × Max OT × 60 × Availability × Capacity / Cycle Time) on a working day with Max OT > 0; otherwise 0',
      'Backlog End = max(0, Backlog Start + Manual Volume − Standard − OT)',
      'The closing backlog becomes the opening backlog for the following day.',
      'Closing Backlog = Backlog remaining at the end of the final simulation day.',
    ),
  ],
  remarks: [
    'If a date is both a public holiday and a weekend, the public-holiday rule takes precedence. Weekend and holiday OT is 0.',
  ],
}

const SIZING_MONTHLY_CHART: LogicSection = {
  id: 'sizing-monthly',
  nav: 'Monthly chart',
  title: 'Monthly Volume vs Overtime',
  group: 'charts',
  note: 'Min HC and the three overtime-related bars are shown only in the chart and are not included in the Results summary. Max HC is Nominal HC (w/o OT). Right Size HC is Right size.',
  sources: [
    { symbol: 'Weekend Days', source: 'Calendar and Holiday', rule: 'Days in the month minus Work Days.' },
    { symbol: 'Max OT', source: 'Team Setup', rule: 'Max overtime, in minutes.' },
    { symbol: 'Weekend Shift HC', source: 'Team Setup', rule: 'Weekend shift headcount.' },
  ],
  formulas: [
    block(
      'Min HC (Full OT)',
      'Min HC = Manual Volume × Cycle Time / 3600 / (Work Days × (Working Hours + Max OT / 60) × Availability × Capacity) − (Weekend Days / Work Days) × Weekend Shift HC',
    ),
    block(
      'Overtime bars',
      'Produced Capacity = Right size × Work Days × Working Hours × Availability × Capacity × 3600 / Cycle Time',
      '         + Weekend Shift HC × Weekend Days × Working Hours × Availability × Capacity × 3600 / Cycle Time',
      'Capacity Gap in FTE = (Manual Volume − Produced Capacity) × Cycle Time / 3600 / (Work Days × Working Hours × Availability × Capacity)',
      'Weekdays Overtime = Capacity Gap in FTE when Produced Capacity ≤ Manual Volume, otherwise 0',
      'Overcapacity = Capacity Gap in FTE when Produced Capacity ≥ Manual Volume, otherwise 0',
      'Max Overtime = Right size × Max OT × Capacity / 60 / (Working Hours × Availability)',
    ),
  ],
  remarks: [
    'Min HC below 0 becomes 0.',
    'The three FTE bars are displayed as 0 when Scenario HC or Cycle Time is missing, or when any required working-hours denominator is zero.',
    "Max Overtime uses headcount and the overtime rule. It does not use that month's volume.",
  ],
}

const SIZING_DAILY_CHART: LogicSection = {
  id: 'sizing-daily-chart',
  nav: 'Daily chart',
  title: 'Daily Volume vs Backlog Aging',
  group: 'charts',
  note: 'Not in Results: backlog age and SLA Turntime. Closing Backlog and the daily roll are in Results.',
  sources: [{ symbol: 'SLA Turntime', source: 'Team Setup', rule: 'Turnaround, in minutes.' }],
  formulas: [
    block('Turntime Days', 'Turntime Days = SLA Turntime / 60 / Working Hours'),
    block(
      'Age',
      'Age = 0 when Backlog End is 0',
      "    = the previous day's backlog age on a weekend or holiday",
      '    = 1 when Backlog Start < Standard + OT',
      '    = min(yesterday + 1, ceil(Backlog Start / (Standard + OT))) otherwise',
    ),
  ],
  remarks: [
    'Backlog is considered outside SLA when Backlog Age exceeds SLA Turntime. SLA Turnaround Time is used only to evaluate SLA performance and does not affect processing capacity.',
  ],
}

const SIZING_SLA_CHART: LogicSection = {
  id: 'sizing-sla',
  nav: 'Monthly SLA%',
  title: 'Monthly SLA% vs Goal',
  group: 'charts',
  note: 'Not in Results. Uses the same daily backlog and age. The chart includes all months covered by the Daily Simulation Period.',
  sources: [
    {
      symbol: 'SLA Target',
      source: 'Team Setup',
      rule: 'SLA target ratio. Compared with SLA%. Not used inside the SLA% formula.',
    },
  ],
  formulas: [
    block(
      undefined,
      'Out of SLA = 0 when Age ≤ Turntime Days',
      '           = Backlog End when Age > Turntime Days and Backlog Start < Standard + OT',
      "           = that day's Manual Volume when Age > Turntime Days and Backlog Start ≥ Standard + OT",
      'SLA% = 0 when total Manual Volume for the month is zero',
      '     = max(0, 1 − sum(Out of SLA) / sum(Manual Volume)) × 100',
      'Goal% = round(SLA Target × 1000) / 10',
    ),
  ],
  remarks: [],
}

const SLOT_RESULTS: LogicSection = {
  id: 'slot-results',
  nav: 'TAT',
  title: 'TAT on period and Actual vs theoretical',
  group: 'results',
  note: 'These figures are shown in Results after the Slot simulation runs. Shift Setup is the number of configured shifts. Sizing rows, Right size, Commercial ratio, Daily adjustment, Capacity ratio and the holiday calendar are not used in the Slot calculation.',
  sources: [
    { symbol: 'Raw', source: 'Per-slot Volume', rule: 'Actual volume of the slot.' },
    { symbol: 'Slot Minutes', source: 'Per-slot Volume', rule: 'Length of the slot. Usually 30.' },
    { symbol: 'Automation', source: 'Team Setup', rule: 'Automation ratio.' },
    { symbol: 'Availability', source: 'Team Setup', rule: 'Availability ratio.' },
    { symbol: 'Cycle Time', source: 'Cycle Time', rule: 'Active baseline median, in seconds.' },
    {
      symbol: 'Start, Duration',
      source: 'Shift Inputs',
      rule: 'Shift start time and duration. The shift window may cross midnight. It includes the start time but excludes the exact end time.',
    },
    { symbol: 'Capacity FTE', source: 'Shift Inputs', rule: 'Headcount of that shift.' },
    { symbol: 'Team Weekend', source: 'Shift Inputs', rule: 'Weekend days for that shift only.' },
    { symbol: 'SLA Turntime', source: 'Team Setup', rule: 'Turnaround, in minutes.' },
    {
      symbol: 'SLA Target',
      source: 'Team Setup',
      rule: 'SLA target ratio. TAT on period is compared with this value.',
    },
  ],
  formulas: [
    block('Shift Setup', 'Shift Setup = number of shifts'),
    block(
      'Per slot',
      'Manual Volume = Raw × (1 − Automation)',
      'Cases per FTE = Slot Minutes × 60 / Cycle Time × Availability',
      'Shift day is determined from the slot start time and the shift Start time. For an overnight shift, slots after midnight remain assigned to the day on which the shift started.',
      "Contribution = Capacity FTE when the shift covers the slot and Shift day is not included in that shift's Team Weekend; otherwise, Contribution = 0.",
      "Shift FTE = sum of each shift's contribution",
      'Capacity = Shift FTE × Cases per FTE',
      'SLA Slots = max(1, ceil(SLA Turntime / Slot Minutes))',
    ),
    block(
      'Results',
      'TAT on period = 1 when period Manual Volume sums to 0 or less',
      '              = max(0, 1 − sum(out of SLA) / sum(Manual Volume))',
      'Actual vs theoretical = 1 when total Manual Volume for the Slot Period is 0 or less.',
      '                      = sum(Capacity) / sum(Manual Volume)',
    ),
  ],
  remarks: [
    'Both calculations cover the full Slot Period and do not reset each day. TAT on period uses Manual Volume and is marked below target when it is lower than SLA Target.',
    'Manual Volume enters a queue in slot order. Capacity clears the oldest batch first. If a batch remains unfinished after the applicable number of SLA Slots, the full remaining batch is counted as Out of SLA for that slot.',
  ],
}

const SLOT_COVERAGE_CHART: LogicSection = {
  id: 'slot-coverage',
  nav: 'Coverage chart',
  title: 'Per-Shift FTE vs Theoretical FTE',
  group: 'charts',
  note: 'Theoretical FTE is shown only in the chart. Shift FTE and Capacity are shown in Results.',
  sources: [],
  formulas: [
    block(
      undefined,
      'Theoretical FTE = 0 when Cases per FTE is 0, otherwise Manual Volume / Cases per FTE',
    ),
  ],
  remarks: [
    'The chart rounds Theoretical FTE to the nearest integer. The stored row keeps 6 decimal places.',
  ],
}

const SLOT_DAILY_TAT_CHART: LogicSection = {
  id: 'slot-daily-tat',
  nav: 'Daily TAT',
  title: 'Cumulative Daily TAT',
  group: 'charts',
  note: 'Cumulative Daily TAT is shown only in the chart. It differs from TAT on period because it resets each day.',
  sources: [],
  formulas: [
    block(
      undefined,
      "Cumulative Daily TAT = 1 when that day's Raw sums to 0 or less",
      "                     = max(0, 1 − that day's out of SLA / that day's Raw)",
    ),
  ],
  remarks: [
    'Resets when the date changes. The denominator is Raw, not Manual Volume.',
  ],
}

export const SIZING_LOGIC: SimulationLogic = {
  title: 'Sizing Simulation',
  summary:
    'Results first: Capacity Creation, Nominal HC, and Closing Backlog. Charts only add formulas that Results does not already show.',
  sections: [
    SIZING_CAPACITY,
    SIZING_NOMINAL,
    SIZING_DAILY_RESULTS,
    SIZING_MONTHLY_CHART,
    SIZING_DAILY_CHART,
    SIZING_SLA_CHART,
  ],
}

export const SLOT_LOGIC: SimulationLogic = {
  title: 'Slot Simulation',
  summary:
    'Results first: TAT on period and Actual vs theoretical. Charts only add formulas that Results does not already show.',
  sections: [SLOT_RESULTS, SLOT_COVERAGE_CHART, SLOT_DAILY_TAT_CHART],
}
