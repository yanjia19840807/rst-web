export type TimesheetPerson = {
  positionId: string
  ccgid: string
  name: string
}

export type TimesheetPeoplePage = {
  items: TimesheetPerson[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type TimesheetPeopleQuery = {
  center: string
  q?: string
  page: number
  pageSize: number
}
