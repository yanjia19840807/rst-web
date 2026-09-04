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
  exerciseUuid: string
  carrier: string
  site: string
  country: string
  domain: string
  pl1: string
  pl2: string
  pl3: string
  toolkit: string
  kpi: string
  deliveryHc: number | string | null
  rsHc: number | string | null
  support: number | string | null
  capacityCreation: number | string | null
  capacityPct: number | string | null
  volumeYoY: string | null
  submittedDate: string
}

export type RepositoryListQuery = {
  exerciseCode?: string
  center?: string
  domain?: string
  pl3Name?: string
  toolkitName?: string
  submittedFrom?: string
  submittedTo?: string
  page?: number
  pageSize?: number
}

export type RepositoryListView = {
  items: RepositoryRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  centers: string[]
  domains: string[]
  pl3Names: string[]
  toolkitNames: string[]
}

export type SupportCategorySummary = {
  category: string
  supportFte: number | string | null
  pctOfSupport: string
}

export type SupportCategoryOption = {
  id: string
  name: string
}

export type SupportRow = {
  exerciseNo: string
  center: string
  domain: string
  pl3: string
  toolkit: string
  standardCategory: string
  activity: string
  frequency: string
  volume: number | string | null
  uom: string
  fte: number | string | null
  comments: string
  submittedDate: string
}

export type SupportRepositoryQuery = {
  center?: string
  categoryId?: string
  toolkitName?: string
  submittedFrom?: string
  submittedTo?: string
  page?: number
  pageSize?: number
}

export type SupportRepositoryResponse = {
  totalSupportFte: number | string | null
  topCategory: string
  topCategoryFte: number | string | null
  categorySummaries: SupportCategorySummary[]
  items: SupportRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  centers: string[]
  categories: SupportCategoryOption[]
  toolkitNames: string[]
}

export type ValidationWorkflowRow = {
  exerciseNo: string
  gbs: string
  domain: string
  pl3: string
  toolkit: string
  currentStep: string
  currentOwner: string
  agingDays: number | null
  capacityCreation: number | string | null
  capacityPct: number | string | null
  volumeYoY: string | null
  submittedDate: string
}

export type ValidationWorkflowQuery = {
  exerciseCode?: string
  center?: string
  domain?: string
  pl3Name?: string
  toolkitName?: string
  agingMinDays?: number
  submittedFrom?: string
  submittedTo?: string
  page?: number
  pageSize?: number
}

export type ValidationWorkflowView = {
  items: ValidationWorkflowRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  centers: string[]
  domains: string[]
  pl3Names: string[]
  toolkitNames: string[]
}

export type BenchmarkRow = {
  gbs: string
  sharedKpiLine: string
  domain: string
  pl1?: string
  pl2?: string
  pl3: string
  pl3Code: string
  cycleTimeSeconds: number | string | null
  dailyCapacityPerAgent: number | string | null
  productionSupportRatioPct: number | string | null
  capacityCreation: number | string | null
  deliveryHc?: number | string | null
  productionSupport?: number | string | null
  submittedDate?: string
}

export type BenchmarkPl3Option = {
  code: string
  name: string
}

export type BenchmarkingQuery = {
  center?: string
  domain?: string
  pl1?: string
  pl2?: string
  pl3Code?: string
  submittedFrom?: string
  submittedTo?: string
  page?: number
  pageSize?: number
}

export type BenchmarkingView = {
  selectedPl3: string
  bestDailyCapacity: number | string | null
  bestDailyCapacityHint: string
  medianCycleTimeSeconds: number | string | null
  productionSupportRatioPct: number | string | null
  items: BenchmarkRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  centers: string[]
  domains: string[]
  pl1Names: string[]
  pl2Names: string[]
  pl3Options: BenchmarkPl3Option[]
}
