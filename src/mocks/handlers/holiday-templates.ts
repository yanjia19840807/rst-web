import { http, HttpResponse } from 'msw'

import type {
  HolidayTemplateCreateRequest,
  HolidayTemplateUpdateRequest,
} from '@/features/holiday-templates/types'

import { holidayTemplateStore } from '../data/holiday-templates'
import { pageOf, pageParams } from '../page'

function problem(status: number, detail: string) {
  return HttpResponse.json({ detail, title: detail }, { status })
}

export const holidayTemplateHandlers = [
  http.get('*/api/v1/holiday-templates', ({ request }) => {
    const url = new URL(request.url)
    const center = url.searchParams.get('center')?.toLowerCase()
    const year = url.searchParams.get('year')
    const status = url.searchParams.get('status')
    let rows = holidayTemplateStore.list()
    if (center) rows = rows.filter((r) => r.center.toLowerCase() === center)
    if (year) rows = rows.filter((r) => String(r.year) === year)
    if (status) rows = rows.filter((r) => r.status === status)
    const paged = pageOf(rows, pageParams(url).page, pageParams(url).pageSize)
    return HttpResponse.json(paged)
  }),

  http.get('*/api/v1/holiday-templates/by-center', ({ request }) => {
    const url = new URL(request.url)
    const center = url.searchParams.get('center')
    const year = Number(url.searchParams.get('year'))
    const match = holidayTemplateStore
      .list()
      .map((s) => holidayTemplateStore.get(s.id)!)
      .find((t) => t.center === center && t.year === year)
    if (!match) return problem(404, 'No holiday template for this Center and year.')
    return HttpResponse.json(match)
  }),

  http.get('*/api/v1/holiday-templates/export-blank', () => {
    return new HttpResponse(new Uint8Array(), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="holiday-template-blank.xlsx"',
      },
    })
  }),

  http.get('*/api/v1/holiday-templates/:id', ({ params }) => {
    const detail = holidayTemplateStore.get(String(params.id))
    if (!detail) return problem(404, 'Holiday template was not found.')
    return HttpResponse.json(detail)
  }),

  http.post('*/api/v1/holiday-templates', async ({ request }) => {
    const body = (await request.json()) as HolidayTemplateCreateRequest
    const now = new Date().toISOString()
    const created = holidayTemplateStore.upsert({
      id: crypto.randomUUID(),
      center: body.center,
      year: body.year,
      defaultWeekendCode: body.defaultWeekendCode || 'SAT_SUN',
      status: 'PUBLISHED',
      version: 1,
      sourceNote: body.sourceNote ?? null,
      publishedAt: now,
      updatedAt: now,
      workingDaysPerYear: 261,
      holidays: (body.holidays ?? []).map((h) => ({
        id: crypto.randomUUID(),
        holidayDate: h.holidayDate,
        holidayName: h.holidayName,
      })),
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/api/v1/holiday-templates/:id', async ({ params, request }) => {
    const existing = holidayTemplateStore.get(String(params.id))
    if (!existing) return problem(404, 'Holiday template was not found.')
    const body = (await request.json()) as HolidayTemplateUpdateRequest
    const now = new Date().toISOString()
    const updated = holidayTemplateStore.upsert({
      ...existing,
      defaultWeekendCode: body.defaultWeekendCode || existing.defaultWeekendCode,
      sourceNote: body.sourceNote !== undefined ? body.sourceNote : existing.sourceNote,
      status: 'PUBLISHED',
      version: existing.version + 1,
      publishedAt: now,
      updatedAt: now,
      holidays:
        body.holidays?.map((h) => ({
          id: crypto.randomUUID(),
          holidayDate: h.holidayDate,
          holidayName: h.holidayName,
        })) ?? existing.holidays,
    })
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/v1/holiday-templates/:id', ({ params }) => {
    holidayTemplateStore.remove(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/v1/holiday-templates/:id/export', () => {
    return new HttpResponse(new Uint8Array(), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="holiday-template.xlsx"',
      },
    })
  }),

  http.post('*/api/v1/holiday-templates/parse', async ({ request }) => {
    const url = new URL(request.url)
    const year = Number(url.searchParams.get('year'))
    if (!Number.isFinite(year) || year < 2000) {
      return problem(422, 'year must be between 2000 and 2100.')
    }
    return HttpResponse.json([
      { holidayDate: `${year}-01-01`, holidayName: "New Year's Day" },
    ])
  }),
]
