import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { tmsQueryKeys } from '@/features/tms-management/api/queries'

import { toolkitApi } from '../api'
import type { ToolkitEditorPayload } from '../types'
import { toolkitQueryKeys } from './queries'

export function useToolkitMutations() {
  const queryClient = useQueryClient()

  const invalidateToolkitLists = () => {
    void queryClient.invalidateQueries({ queryKey: [...toolkitQueryKeys.all, 'list'] })
    void queryClient.invalidateQueries({ queryKey: toolkitQueryKeys.hierarchy() })
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.toolkits() })
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.supervisorToolkits() })
  }

  const create = useMutation({
    mutationFn: (input: ToolkitEditorPayload) => toolkitApi.create(input),
    onSuccess: invalidateToolkitLists,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ToolkitEditorPayload }) =>
      toolkitApi.update(id, input),
    onSuccess: (toolkit, { id }) => {
      queryClient.setQueryData(toolkitQueryKeys.detail(id), toolkit)
      invalidateToolkitLists()
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => toolkitApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: toolkitQueryKeys.detail(id) })
      invalidateToolkitLists()
    },
  })

  return { create, update, remove }
}
