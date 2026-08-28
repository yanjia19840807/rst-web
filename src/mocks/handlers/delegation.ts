import { http, HttpResponse } from 'msw'

import type { Delegation } from '@/features/delegation/types'

const now = new Date()
const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

const granted: Delegation[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    delegatorCcgid: 'S00628182',
    delegatorName: 'YANG Brenda',
    delegateCcgid: 'AGENT010',
    delegateName: 'Test Agent AGENT010',
    delegatorRoles: ['SUPERVISOR'],
    delegatorCenter: 'Kuala Lumpur',
    validFrom: now.toISOString(),
    validUntil: until.toISOString(),
    status: 'ACTIVE',
    createdAt: now.toISOString(),
    endedAt: null,
  },
]

export const delegationHandlers = [
  http.get('*/api/v1/delegations/granted', () => HttpResponse.json(granted)),
  http.get('*/api/v1/delegations/received', () => HttpResponse.json([])),
  http.get('*/api/v1/delegations/candidates', ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const items = [
      { ccgid: 'AGENT010', name: 'Test Agent AGENT010', center: 'Kuala Lumpur' },
      { ccgid: 'S00813982', name: 'Demo Manager', center: 'Kuala Lumpur' },
    ].filter((item) => !q || item.name.toLowerCase().includes(q) || item.ccgid.toLowerCase().includes(q))
    return HttpResponse.json({
      items,
      page: 1,
      pageSize: 10,
      total: items.length,
      totalPages: 1,
    })
  }),
  http.post('*/api/v1/delegations', async ({ request }) => {
    const body = (await request.json()) as { delegateCcgid: string; validFrom: string; validUntil: string }
    const created: Delegation = {
      id: crypto.randomUUID(),
      delegatorCcgid: 'S00628182',
      delegatorName: 'YANG Brenda',
      delegateCcgid: body.delegateCcgid,
      delegateName: body.delegateCcgid,
      delegatorRoles: ['SUPERVISOR'],
      delegatorCenter: 'Kuala Lumpur',
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      endedAt: null,
    }
    granted.unshift(created)
    return HttpResponse.json(created, { status: 201 })
  }),
  http.post('*/api/v1/delegations/:id/revoke', ({ params }) => {
    const row = granted.find((item) => item.id === params.id)
    if (!row) return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    row.status = 'REVOKED'
    row.endedAt = new Date().toISOString()
    return HttpResponse.json(row)
  }),
]
