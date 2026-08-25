import { apiRequest } from '@/api/client'

import type { SupportCategoryView } from './types'

const BASE = '/api/v1/support-categories'

export const supportCategoryApi = {
  list: () => apiRequest<SupportCategoryView>(BASE),
}
