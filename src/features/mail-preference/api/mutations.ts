import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { mailPreferenceApi } from '../api'
import type { MailPreferenceUpdate } from '../types'
import { mailPreferenceQueryKeys } from './queries'

export function useSaveMailPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: MailPreferenceUpdate) => mailPreferenceApi.save(body),
    onSuccess: (data) => {
      queryClient.setQueryData(mailPreferenceQueryKeys.current(), data)
    },
  })
}
