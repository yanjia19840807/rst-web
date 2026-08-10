import type {
  HolidayTemplateDetail,
  HolidayTemplateLine,
  HolidayTemplateSummary,
} from '@/features/holiday-templates/types'

type TemplateRecord = HolidayTemplateDetail

const china2025: HolidayTemplateLine[] = [
  { id: 'h1', holidayDate: '2025-01-01', holidayName: "New Year's Day" },
  { id: 'h2', holidayDate: '2025-01-28', holidayName: 'Spring Festival' },
  { id: 'h3', holidayDate: '2025-01-29', holidayName: 'Spring Festival' },
  { id: 'h4', holidayDate: '2025-01-30', holidayName: 'Spring Festival' },
  { id: 'h5', holidayDate: '2025-01-31', holidayName: 'Spring Festival' },
  { id: 'h6', holidayDate: '2025-02-03', holidayName: 'Spring Festival' },
  { id: 'h7', holidayDate: '2025-02-04', holidayName: 'Spring Festival' },
  { id: 'h8', holidayDate: '2025-04-04', holidayName: 'Qingming Festival' },
  { id: 'h9', holidayDate: '2025-05-01', holidayName: 'Labour Day' },
  { id: 'h10', holidayDate: '2025-05-02', holidayName: 'Labour Day' },
  { id: 'h11', holidayDate: '2025-05-05', holidayName: 'Labour Day' },
  { id: 'h12', holidayDate: '2025-06-02', holidayName: 'Dragon Boat Festival' },
  { id: 'h13', holidayDate: '2025-10-01', holidayName: 'National Day' },
  { id: 'h14', holidayDate: '2025-10-02', holidayName: 'National Day' },
  { id: 'h15', holidayDate: '2025-10-03', holidayName: 'National Day' },
  { id: 'h16', holidayDate: '2025-10-06', holidayName: 'National Day / Mid-Autumn' },
  { id: 'h17', holidayDate: '2025-10-07', holidayName: 'National Day / Mid-Autumn' },
  { id: 'h18', holidayDate: '2025-10-08', holidayName: 'National Day / Mid-Autumn' },
]

const china2026: HolidayTemplateLine[] = china2025.map((h, index) => ({
  id: `h2026-${index + 1}`,
  holidayDate: h.holidayDate.replace(/^2025/, '2026'),
  holidayName: h.holidayName,
}))

const store: TemplateRecord[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    center: 'GBS China',
    year: 2025,
    defaultWeekendCode: 'SAT_SUN',
    status: 'PUBLISHED',
    version: 1,
    sourceNote: 'Demo workbook Public Holidays 2025',
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workingDaysPerYear: 243,
    holidays: china2025,
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    center: 'GBS China',
    year: 2026,
    defaultWeekendCode: 'SAT_SUN',
    status: 'PUBLISHED',
    version: 1,
    sourceNote: 'Demo workbook Public Holidays 2026',
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workingDaysPerYear: 243,
    holidays: china2026,
  },
]

function toSummary(item: TemplateRecord): HolidayTemplateSummary {
  return {
    id: item.id,
    center: item.center,
    year: item.year,
    defaultWeekendCode: item.defaultWeekendCode,
    status: item.status,
    version: item.version,
    holidayCount: item.holidays.length,
    sourceNote: item.sourceNote,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
  }
}

export const holidayTemplateStore = {
  list: () => store.map(toSummary),
  get: (id: string) => store.find((item) => item.id === id) ?? null,
  upsert: (item: TemplateRecord) => {
    const index = store.findIndex((row) => row.id === item.id)
    if (index >= 0) store[index] = item
    else store.push(item)
    return item
  },
  remove: (id: string) => {
    const index = store.findIndex((row) => row.id === id)
    if (index >= 0) store.splice(index, 1)
  },
}
