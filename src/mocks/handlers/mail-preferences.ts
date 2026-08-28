import { http, HttpResponse } from 'msw'

import type { MailPreferenceType, MailPreferenceView } from '@/features/mail-preference/types'

const types: MailPreferenceType[] = [
  { id: 'submission.outcome', label: 'Exercise returned, rejected or approved', enabled: true },
]

function view(): MailPreferenceView {
  return {
    role: 'SUPERVISOR',
    email: 's00628182@dev.local',
    emailMissing: false,
    types: types.map((row) => ({ ...row })),
  }
}

export const mailPreferenceHandlers = [
  http.get('*/api/v1/me/mail-preferences', () => HttpResponse.json(view())),
  http.put('*/api/v1/me/mail-preferences', async ({ request }) => {
    const body = (await request.json()) as { types?: Array<{ id: string; enabled: boolean }> }
    for (const incoming of body.types ?? []) {
      const row = types.find((item) => item.id === incoming.id)
      if (row) row.enabled = incoming.enabled
    }
    return HttpResponse.json(view())
  }),
]
