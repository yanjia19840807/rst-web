import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { approvalApi } from '../api'
import type { ApprovalQueueQuery } from '../types'

export const approvalQueryKeys = {
  all: ['approval'] as const,
  queue: (query: ApprovalQueueQuery = {}) =>
    [...approvalQueryKeys.all, 'queue', query] as const,
  detail: (submissionId: string) =>
    [...approvalQueryKeys.all, 'detail', submissionId] as const,
}

export function useApprovalQueueQuery(filters: MaybeRefOrGetter<ApprovalQueueQuery> = {}) {
  const resolved = computed(() => toValue(filters))
  return useQuery({
    queryKey: computed(() => approvalQueryKeys.queue(resolved.value)),
    queryFn: () => approvalApi.queue(resolved.value),
    placeholderData: keepPreviousData,
  })
}

export function useApprovalDetailQuery(
  submissionId: MaybeRefOrGetter<string | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const id = computed(() => toValue(submissionId))
  const isEnabled = computed(() => Boolean(id.value) && toValue(enabled))
  return useQuery({
    queryKey: computed(() => approvalQueryKeys.detail(id.value ?? '')),
    queryFn: () => approvalApi.detail(id.value!),
    enabled: isEnabled,
  })
}
