import { http, HttpResponse } from 'msw'

import type { TimesheetPerson } from '@/features/timesheet/types'

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

export const timesheetHandlers = [
  http.get('*/api/v1/timesheet/people', ({ request }) => {
    const url = new URL(request.url)
    const needle = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const pageNo = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? 10)))
    const matched = needle
      ? people.filter((item) => item.name.toLowerCase().includes(needle))
      : people
    const totalPages = Math.max(1, Math.ceil(matched.length / pageSize))
    const safePage = Math.min(pageNo, totalPages)
    const start = (safePage - 1) * pageSize
    return HttpResponse.json({
      items: matched.slice(start, start + pageSize),
      page: safePage,
      pageSize,
      total: matched.length,
      totalPages,
    })
  }),
]
