import { apiRequest } from '@/api/client'

import type { DomainHeadPage, SaveDomainHeadsRequest } from './types'

const base = '/api/v1/domain-heads'

export const domainHeadApi = {
  page: () => apiRequest<DomainHeadPage>(base),
  save: (body: SaveDomainHeadsRequest) =>
    apiRequest<DomainHeadPage>(base, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
}
