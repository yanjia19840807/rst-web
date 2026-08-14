import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { toolkitApi } from '../api'
import type { ToolkitEditorPayload } from '../types'
import { toolkitQueryKeys } from './queries'

export function useToolkitMutations() {
  const queryClient = useQueryClient()

  const refreshToolkits = () =>
    queryClient.invalidateQueries({ queryKey: toolkitQueryKeys.all })

  const create = useMutation({
    mutationFn: (input: ToolkitEditorPayload) => toolkitApi.create(input),
    onSuccess: refreshToolkits,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ToolkitEditorPayload }) =>
      toolkitApi.update(id, input),
    onSuccess: refreshToolkits,
  })

  const remove = useMutation({
    mutationFn: (id: string) => toolkitApi.remove(id),
    onSuccess: refreshToolkits,
  })

  return { create, update, remove }
}
