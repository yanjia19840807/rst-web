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
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.managedToolkits() })
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.sessionsPrefix() })
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.sessionPrefix() })
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.current() })
    void queryClient.invalidateQueries({ queryKey: tmsQueryKeys.summary() })
  }

  const rememberToolkit = (toolkit: { id: string }) => {
    queryClient.setQueryData(toolkitQueryKeys.detail(toolkit.id), toolkit)
    invalidateToolkitLists()
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

  const addSubtask = useMutation({
    mutationFn: ({
      id,
      name,
      description,
      displayOrder,
    }: {
      id: string
      name: string
      description?: string
      displayOrder?: number
    }) => toolkitApi.addSubtask(id, { name, description, displayOrder }),
    onSuccess: rememberToolkit,
  })

  const updateSubtask = useMutation({
    mutationFn: ({
      id,
      subtaskId,
      name,
      description,
      displayOrder,
    }: {
      id: string
      subtaskId: string
      name: string
      description?: string
      displayOrder?: number
    }) => toolkitApi.updateSubtask(id, subtaskId, { name, description, displayOrder }),
    onSuccess: rememberToolkit,
  })

  const setEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toolkitApi.setEnabled(id, enabled),
    onSuccess: rememberToolkit,
  })

  const setSubtaskEnabled = useMutation({
    mutationFn: ({
      id,
      subtaskId,
      enabled,
    }: {
      id: string
      subtaskId: string
      enabled: boolean
    }) => toolkitApi.setSubtaskEnabled(id, subtaskId, enabled),
    onSuccess: rememberToolkit,
  })

  return { create, update, addSubtask, updateSubtask, setEnabled, setSubtaskEnabled }
}
