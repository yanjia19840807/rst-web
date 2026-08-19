import { apiRequest } from '@/api/client'

import type { SupportTaxonomyView } from './types'

const BASE = '/api/v1/support-taxonomy'

export const supportTaxonomyApi = {
  list: () => apiRequest<SupportTaxonomyView>(BASE),
}
