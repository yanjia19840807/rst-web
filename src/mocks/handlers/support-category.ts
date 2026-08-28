import { http, HttpResponse } from 'msw'

import { supportCategoryStore } from '../data/support-category'

export const supportCategoryHandlers = [
  http.get('*/api/v1/support-categories', () => HttpResponse.json(supportCategoryStore.list())),
  http.get('*/api/v1/admin/support-categories', () =>
    HttpResponse.json(supportCategoryStore.listAdmin()),
  ),
  http.post('*/api/v1/admin/support-categories', async ({ request }) => {
    const body = (await request.json()) as { name?: string }
    const result = supportCategoryStore.create(body.name ?? '')
    if (result.error) {
      return HttpResponse.json({ detail: result.error }, { status: 422 })
    }
    return HttpResponse.json(result.row)
  }),
  http.put('*/api/v1/admin/support-categories/order', async ({ request }) => {
    const body = (await request.json()) as { ids?: string[] }
    const result = supportCategoryStore.reorder(body.ids ?? [])
    if (result.error) {
      return HttpResponse.json({ detail: result.error }, { status: 422 })
    }
    return HttpResponse.json({ categories: result.categories })
  }),
  http.put('*/api/v1/admin/support-categories/:id', async ({ params, request }) => {
    const body = (await request.json()) as {
      name?: string
      status?: 'ACTIVE' | 'INACTIVE'
      displayOrder?: number
    }
    const result = supportCategoryStore.update(String(params.id), {
      name: body.name ?? '',
      status: body.status ?? 'ACTIVE',
      displayOrder: body.displayOrder ?? 0,
    })
    if (result.error) {
      const status = result.error.includes('not found') ? 404 : 422
      return HttpResponse.json({ detail: result.error }, { status })
    }
    return HttpResponse.json(result.row)
  }),
  http.delete('*/api/v1/admin/support-categories/:id', ({ params }) => {
    const result = supportCategoryStore.remove(String(params.id))
    if (result.error) {
      return HttpResponse.json({ detail: result.error }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
