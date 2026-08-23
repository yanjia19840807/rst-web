import { http, HttpResponse } from 'msw'

import type { TimesheetPerson } from '@/features/timesheet/types'
import type { DomainHeadPage, SaveDomainHeadsRequest } from '@/features/domain-heads/types'

const people: TimesheetPerson[] = [
  {
    positionId: 'POS-DH-001',
    ccgid: 'S00813982',
    name: 'Demo Domain Head',
  },
  {
    positionId: 'POS-SUP-001',
    ccgid: 'S00628182',
    name: 'YANG Brenda',
  },
]

let page: DomainHeadPage = {
  center: 'Kuala Lumpur',
  dailyAvailable: true,
  remountedCount: null,
  domains: [
    {
      domain: 'Finance',
      positionId: null,
      ccgid: null,
      name: null,
      status: 'MISSING',
    },
    {
      domain: 'Customer Service',
      positionId: 'POS-DH-001',
      ccgid: 'S00813982',
      name: 'Demo Domain Head',
      status: 'CONFIGURED',
    },
  ],
}

export const domainHeadHandlers = [
  http.get('*/api/v1/domain-heads', () => HttpResponse.json(page)),
  http.put('*/api/v1/domain-heads', async ({ request }) => {
    const body = (await request.json()) as SaveDomainHeadsRequest
    const byPosition = new Map(people.map((item) => [item.positionId, item]))
    const nextDomains = page.domains.map((row) => {
      const change = body.mappings.find((item) => item.domain === row.domain)
      if (!change) return row
      if (!change.positionId) {
        return {
          ...row,
          positionId: null,
          ccgid: null,
          name: null,
          status: 'MISSING' as const,
        }
      }
      const person = byPosition.get(change.positionId)
      return {
        ...row,
        positionId: change.positionId,
        ccgid: person?.ccgid ?? null,
        name: person?.name ?? null,
        status: person ? ('CONFIGURED' as const) : ('STALE' as const),
      }
    })
    page = { ...page, remountedCount: 0, domains: nextDomains }
    return HttpResponse.json(page)
  }),
]
