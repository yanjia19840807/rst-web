import { http, HttpResponse } from 'msw'

import { supportCategoryStore } from '../data/support-category'

export const supportCategoryHandlers = [
  http.get('*/api/v1/support-categories', () => HttpResponse.json(supportCategoryStore.list())),
]
