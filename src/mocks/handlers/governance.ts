import { http, HttpResponse } from 'msw'

import type { BenchmarkPl3Option, BenchmarkRow } from '@/features/governance-reports/types'

import { benchmarkingRows, dashboardData } from '../data/governance'
import { pageOf, pageParams } from '../page'

function distinct(rows: BenchmarkRow[], getter: (row: BenchmarkRow) => string | undefined) {
  return [...new Set(rows.map(getter).filter((value): value is string => Boolean(value)))].sort()
}

function pl3Options(rows: BenchmarkRow[]): BenchmarkPl3Option[] {
  const names = new Map<string, string>()
  for (const row of rows) {
    if (!row.pl3Code) continue
    if (!names.has(row.pl3Code)) names.set(row.pl3Code, row.pl3 || row.pl3Code)
  }
  return [...names.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code))
}

function summarize(selectedPl3: string, items: BenchmarkRow[]) {
  if (!items.length) {
    return {
      selectedPl3,
      bestDailyCapacity: null,
      bestDailyCapacityHint: '',
      medianCycleTimeSeconds: null,
      productionSupportRatioPct: null,
    }
  }
  let best: BenchmarkRow | null = null
  const cycleTimes: number[] = []
  let delivery = 0
  let support = 0
  for (const row of items) {
    const daily = Number(row.dailyCapacityPerAgent)
    if (Number.isFinite(daily) && (!best || daily > Number(best.dailyCapacityPerAgent))) {
      best = row
    }
    const cycle = Number(row.cycleTimeSeconds)
    if (Number.isFinite(cycle)) cycleTimes.push(cycle)
    delivery += Number(row.deliveryHc) || 0
    support += Number(row.productionSupport) || 0
  }
  cycleTimes.sort((a, b) => a - b)
  const n = cycleTimes.length
  const median =
    n === 0
      ? null
      : n % 2 === 1
        ? cycleTimes[(n - 1) / 2]
        : (cycleTimes[n / 2 - 1]! + cycleTimes[n / 2]!) / 2
  return {
    selectedPl3,
    bestDailyCapacity: best ? Number(best.dailyCapacityPerAgent) : null,
    bestDailyCapacityHint: best?.gbs ?? '',
    medianCycleTimeSeconds: median,
    productionSupportRatioPct: delivery > 0 ? Math.round((support / delivery) * 1000) / 10 : null,
  }
}

export const governanceHandlers = [
  http.get('*/api/v1/governance/dashboard', () => HttpResponse.json(dashboardData)),
  http.get('*/api/v1/governance/benchmarking', ({ request }) => {
    const url = new URL(request.url)
    const center = url.searchParams.get('center')
    const domain = url.searchParams.get('domain')
    const pl1 = url.searchParams.get('pl1')
    const pl2 = url.searchParams.get('pl2')
    const pl3Code = url.searchParams.get('pl3Code')
    const submittedFrom = url.searchParams.get('submittedFrom')
    const submittedTo = url.searchParams.get('submittedTo')
    const source = benchmarkingRows
    const items = pl3Code
      ? source.filter((row) => {
          if (row.pl3Code !== pl3Code) return false
          if (center && row.gbs !== center) return false
          if (domain && row.domain !== domain) return false
          if (pl1 && row.pl1 !== pl1) return false
          if (pl2 && row.pl2 !== pl2) return false
          if (submittedFrom && (row.submittedDate ?? '') < submittedFrom) return false
          if (submittedTo && (row.submittedDate ?? '') > submittedTo) return false
          return true
        })
      : []
    const options = pl3Options(source)
    const selectedPl3 = options.find((item) => item.code === pl3Code)?.name ?? pl3Code ?? ''
    const cards = summarize(selectedPl3, items)
    const paged = pageOf(items, pageParams(url).page, pageParams(url).pageSize)
    return HttpResponse.json({
      ...cards,
      ...paged,
      centers: distinct(source, (row) => row.gbs),
      domains: distinct(source, (row) => row.domain),
      pl1Names: distinct(source, (row) => row.pl1),
      pl2Names: distinct(source, (row) => row.pl2),
      pl3Options: options,
    })
  }),
]
