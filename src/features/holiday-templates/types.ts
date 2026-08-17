export type HolidayTemplateStatus = 'DRAFT' | 'PUBLISHED'

export interface HolidayTemplateLine {
  id?: string
  holidayDate: string
  holidayName: string
}

export interface HolidayTemplateSummary {
  id: string
  center: string
  year: number
  defaultWeekendCode: string
  status: HolidayTemplateStatus
  version: number
  holidayCount: number
  sourceNote: string | null
  publishedAt: string | null
  updatedAt: string
}

export interface HolidayTemplateListQuery {
  center?: string
  year?: number
  status?: string
  page?: number
  pageSize?: number
}

export interface HolidayTemplateListView {
  items: HolidayTemplateSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface HolidayTemplateDetail extends Omit<HolidayTemplateSummary, 'holidayCount'> {
  workingDaysPerYear: number
  holidays: HolidayTemplateLine[]
}

export interface HolidayTemplateCreateRequest {
  center: string
  year: number
  defaultWeekendCode?: string | null
  sourceNote?: string | null
  holidays?: HolidayTemplateLine[]
}

export interface HolidayTemplateUpdateRequest {
  defaultWeekendCode?: string | null
  sourceNote?: string | null
  holidays?: HolidayTemplateLine[]
}
