export type GovernanceScope = 'lth' | 'ho'

export type DashboardMetric = {
  label: string
  value: string
  hint: string
  tone?: 'good' | 'bad' | 'warn' | 'neutral'
}

export type DashboardCenterRow = {
  center: string
  applicablePl3: number
  completedThisQuarter: number
  completionPct: string
  completed3To6Months: number
  neverDone: number
  completed6To12Months: number
  completedOver1Year: number
  onTrack: boolean
}

export type DashboardDomainRow = {
  domain: string
  applicablePl3: number
  completed: number
  pct: string
  neverDone: number
}

export type DashboardResponse = {
  metrics: DashboardMetric[]
  centers: DashboardCenterRow[]
  domainsByCenter: Record<string, DashboardDomainRow[]>
}

export type RepositoryRow = {
  exerciseId: string
  carrier: string
  site: string
  country: string
  domain: string
  pl1: string
  pl2: string
  pl3: string
  toolkit: string
  kpi: string
  deliveryHc: string
  rsHc: string
  support: string
  capacityCreation: string
  capacityPct: string
  volumeYoY: string
  submittedDate: string
}

export type SupportCategorySummary = {
  category: string
  supportFte: string
  pctOfSupport: string
  topActivity: string
}

export type SupportRow = {
  exerciseNo: string
  gbsSite: string
  domain: string
  pl3: string
  toolkit: string
  standardCategory: string
  activity: string
  frequency: string
  volume: string
  uom: string
  fte: string
  comments: string
  submittedDate: string
}

export type SupportRepositoryResponse = {
  totalSupportFte: string
  topCategory: string
  topCategoryFte: string
  categorySummaries: SupportCategorySummary[]
  rows: SupportRow[]
}

export type ValidationWorkflowRow = {
  exerciseNo: string
  gbs: string
  domain: string
  pl3: string
  toolkit: string
  currentStep: string
  currentOwner: string
  agingDays: number
  capacityCreation: string
  capacityPct: string
  volumeYoY: string
  submittedDate: string
}

export type BenchmarkRow = {
  gbs: string
  sharedKpiLine: string
  domain: string
  pl3: string
  cycleTime: string
  dailyCapacityPerAgent: string
  productionSupportRatio: string
  capacityCreation: string
}

export type BenchmarkingResponse = {
  selectedPl3: string
  bestDailyCapacity: string
  bestDailyCapacityHint: string
  medianCycleTime: string
  productionSupportRatio: string
  rows: BenchmarkRow[]
}
