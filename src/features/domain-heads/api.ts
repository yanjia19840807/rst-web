import { apiRequest } from '@/api/client'

import type { DomainHeadPage, SaveDomainHeadsRequest } from './types'

const base = '/api/v1/domain-heads'

export const domainHeadApi = {
  centers: () => apiRequest<string[]>(`${base}/centers`),
  page: (center?: string) => {
    const params = new URLSearchParams()
    if (center?.trim()) params.set('center', center.trim())
    const query = params.toString()
    return apiRequest<DomainHeadPage>(query ? `${base}?${query}` : base)
  },
  save: (body: SaveDomainHeadsRequest) =>
    apiRequest<DomainHeadPage>(base, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
}
