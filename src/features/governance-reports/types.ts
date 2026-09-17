export type GovernanceScope = 'lth' | 'ho'

export type DashboardMetric = {
  label: string
  value: string
  hint: string
  tone?: 'good' | 'bad' | 'warn' | 'neutral'
}

export type DashboardCenterRow = {
  center: string
  applicableHc: number
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
  applicableHc: number
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
  sizingMonth: string
  validatedDate: string
}

export type RepositoryListQuery = {
  exerciseCode?: string
  center?: string
  domain?: string
  pl3Name?: string
  toolkitName?: string
  sizingMonth?: string
  validatedFrom?: string
  validatedTo?: string
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
  totalDeliveryHc: number | string | null
  totalRightSizingHc: number | string | null
  totalSupport: number | string | null
  totalCapacityCreation: number | string | null
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
  exerciseUuid: string
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
  sizingMonth: string
  validatedDate: string
}

export type SupportRepositoryQuery = {
  exerciseCode?: string
  center?: string
  domain?: string
  pl3Name?: string
  categoryId?: string
  toolkitName?: string
  sizingMonth?: string
  validatedFrom?: string
  validatedTo?: string
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
  domains: string[]
  pl3Names: string[]
  categories: SupportCategoryOption[]
  toolkitNames: string[]
}

export type ValidationWorkflowRow = {
  exerciseNo: string
  exerciseUuid: string
  gbs: string
  domain: string
  pl1: string
  pl2: string
  pl3: string
  toolkit: string
  currentStep: string
  currentOwner: string
  agingDays: number | null
  capacityCreation: number | string | null
  capacityPct: number | string | null
  volumeYoY: string | null
  sizingMonth: string
  submittedDate: string
}

export type ValidationWorkflowQuery = {
  exerciseCode?: string
  center?: string
  domain?: string
  pl3Name?: string
  toolkitName?: string
  sizingMonth?: string
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
  carrier: string
  site: string
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
  sizingMonth?: string
  validatedDate?: string
}

export type BenchmarkProcessPath = {
  domain: string
  pl1: string
  pl2: string
  pl3Code: string
  pl3Name: string
}

export type BenchmarkingQuery = {
  domain?: string
  pl1?: string
  pl2?: string
  pl3Code?: string
  sizingMonth?: string
  validatedFrom?: string
  validatedTo?: string
  page?: number
  pageSize?: number
}

export type BenchmarkCenterComparison = {
  gbs: string
  cycleTimeSeconds: number | string | null
  dailyCapacityPerAgent: number | string | null
  productionSupportRatioPct: number | string | null
  capacityCreation: number | string | null
}

export type BenchmarkingView = {
  selectedPl3: string
  dailyCapacityPerAgent: number | string | null
  cycleTimeSeconds: number | string | null
  productionSupportRatioPct: number | string | null
  items: BenchmarkRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  processPaths: BenchmarkProcessPath[]
  centerComparisons: BenchmarkCenterComparison[]
}
