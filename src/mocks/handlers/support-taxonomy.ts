import { http, HttpResponse } from 'msw'

import { supportTaxonomyStore } from '../data/support-taxonomy'

export const supportTaxonomyHandlers = [
  http.get('*/api/v1/support-taxonomy', () => HttpResponse.json(supportTaxonomyStore.list())),
]
