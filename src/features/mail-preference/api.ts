import { apiRequest } from '@/api/client'

import type { MailPreferenceUpdate, MailPreferenceView } from './types'

const base = '/api/v1/me/mail-preferences'

export const mailPreferenceApi = {
  current: () => apiRequest<MailPreferenceView>(base),
  save: (body: MailPreferenceUpdate) =>
    apiRequest<MailPreferenceView>(base, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
}
