import { useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { mailPreferenceApi } from '../api'

export const mailPreferenceQueryKeys = {
  all: ['mail-preferences'] as const,
  current: () => [...mailPreferenceQueryKeys.all, 'current'] as const,
}

export function useMailPreferencesQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: mailPreferenceQueryKeys.current(),
    queryFn: () => mailPreferenceApi.current(),
    enabled: computed(() => toValue(enabled)),
  })
}
