import { http, HttpResponse } from 'msw'

import type {
  HolidayTemplateCreateRequest,
  HolidayTemplateUpdateRequest,
} from '@/features/holiday-templates/types'

import { holidayTemplateStore } from '../data/holiday-templates'

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
    if (center) rows = rows.filter((r) => r.center.toLowerCase().includes(center))
    if (year) rows = rows.filter((r) => String(r.year) === year)
    if (status) rows = rows.filter((r) => r.status === status)
    return HttpResponse.json(rows)
  }),

  http.get('*/api/v1/holiday-templates/by-center', ({ request }) => {
    const url = new URL(request.url)
    const center = url.searchParams.get('center')
    const year = Number(url.searchParams.get('year'))
    const match = holidayTemplateStore
      .list()
      .map((s) => holidayTemplateStore.get(s.id)!)
      .find((t) => t.center === center && t.year === year && t.status === 'PUBLISHED')
    if (!match) return problem(404, 'No published holiday template for this Center and year.')
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
      status: 'DRAFT',
      version: 0,
      sourceNote: body.sourceNote ?? null,
      publishedAt: null,
      updatedAt: now,
      workingDaysPerYear: 261,
      holidays: (body.holidays ?? []).map((h) => ({
        id: crypto.randomUUID(),
        holidayDate: h.holidayDate,
        holidayName: h.holidayName,
        workingDayOverride: h.workingDayOverride ?? null,
      })),
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('*/api/v1/holiday-templates/:id', async ({ params, request }) => {
    const existing = holidayTemplateStore.get(String(params.id))
    if (!existing) return problem(404, 'Holiday template was not found.')
    const body = (await request.json()) as HolidayTemplateUpdateRequest
    const updated = holidayTemplateStore.upsert({
      ...existing,
      defaultWeekendCode: body.defaultWeekendCode || existing.defaultWeekendCode,
      sourceNote: body.sourceNote !== undefined ? body.sourceNote : existing.sourceNote,
      status: 'DRAFT',
      updatedAt: new Date().toISOString(),
      holidays:
        body.holidays?.map((h) => ({
          id: crypto.randomUUID(),
          holidayDate: h.holidayDate,
          holidayName: h.holidayName,
          workingDayOverride: h.workingDayOverride ?? null,
        })) ?? existing.holidays,
    })
    return HttpResponse.json(updated)
  }),

  http.post('*/api/v1/holiday-templates/:id/publish', ({ params }) => {
    const existing = holidayTemplateStore.get(String(params.id))
    if (!existing) return problem(404, 'Holiday template was not found.')
    if (!existing.holidays.length) return problem(422, 'Publish requires at least one holiday line.')
    const published = holidayTemplateStore.upsert({
      ...existing,
      status: 'PUBLISHED',
      version: existing.version + 1,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return HttpResponse.json(published)
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

  http.post('*/api/v1/holiday-templates/:id/import', ({ params }) => {
    const existing = holidayTemplateStore.get(String(params.id))
    if (!existing) return problem(404, 'Holiday template was not found.')
    return HttpResponse.json(existing)
  }),
]
