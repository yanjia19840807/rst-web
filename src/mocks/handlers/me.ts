import { http, HttpResponse } from 'msw'

import {
  DEFAULT_DEV_IDENTITY,
  DEV_CCGID_HEADER,
  DEV_CENTER_HEADER,
  DEV_ROLE_HEADER,
  displayNameForCcgid,
} from '@/auth/dev-identity'
import { isAppRole } from '@/auth/permissions'

function headerValue(request: Request, name: string): string | undefined {
  const value = request.headers.get(name)?.trim()
  return value ? value : undefined
}

/** Test-login identity from the same headers the real API reads. */
export const meHandlers = [
  http.get('*/api/v1/me', ({ request }) => {
    const ccgid = (headerValue(request, DEV_CCGID_HEADER) || DEFAULT_DEV_IDENTITY.ccgid).toUpperCase()
    const roleRaw = (headerValue(request, DEV_ROLE_HEADER) || DEFAULT_DEV_IDENTITY.role).toUpperCase()
    const role = isAppRole(roleRaw) ? roleRaw : DEFAULT_DEV_IDENTITY.role
    const center = headerValue(request, DEV_CENTER_HEADER) || null
    const displayName = displayNameForCcgid(ccgid)
    return HttpResponse.json({
      ccgid,
      displayName,
      email: `${ccgid.toLowerCase()}@dev.local`,
      roles: [role],
      scopes: ['TIMESHEET', 'SELF'],
      center,
      actor: { ccgid, displayName },
      delegationId: null,
      devOverrideEnabled: true,
    })
  }),
]
