import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { geographyApi } from '../api'

export const geographyQueryKeys = {
  all: ['geography'] as const,
  countries: ['geography', 'countries'] as const,
  regions: ['geography', 'regions'] as const,
  admin: ['geography', 'admin'] as const,
  clusters: ['geography', 'clusters'] as const,
}

export function useCountriesQuery() {
  return useQuery({
    queryKey: geographyQueryKeys.countries,
    queryFn: () => geographyApi.countries(),
  })
}

export function useRegionsQuery() {
  return useQuery({
    queryKey: geographyQueryKeys.regions,
    queryFn: () => geographyApi.regions(),
  })
}

export function useRegionAdminQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: geographyQueryKeys.admin,
    queryFn: () => geographyApi.listRegions(),
    enabled: computed(() => toValue(enabled)),
  })
}

export function useClusterQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: geographyQueryKeys.clusters,
    queryFn: () => geographyApi.listClusters(),
    enabled: computed(() => toValue(enabled)),
  })
}
