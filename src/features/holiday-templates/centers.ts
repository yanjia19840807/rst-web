/** GBS Centers aligned with backend CenterCountryDefaults. */
export const GBS_CENTERS = [
  'GBS China',
  'GBS India',
  'GBS Philippines',
  'GBS Costa Rica',
  'GBS Lebanon',
  'GBS Estonia',
  'GBS Portugal',
] as const

export type GbsCenter = (typeof GBS_CENTERS)[number]
