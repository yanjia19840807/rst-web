import { apiRequest } from '@/api/client'

import type { TimesheetPeoplePage, TimesheetPeopleQuery } from './types'

export const timesheetApi = {
  people: (query: TimesheetPeopleQuery) => {
    const params = new URLSearchParams()
    params.set('center', query.center)
    if (query.q?.trim()) params.set('q', query.q.trim())
    params.set('page', String(query.page))
    params.set('pageSize', String(query.pageSize))
    return apiRequest<TimesheetPeoplePage>(`/api/v1/timesheet/people?${params.toString()}`)
  },
}
