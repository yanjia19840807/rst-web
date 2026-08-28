import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { timesheetSyncApi } from '../api'
import type { TimesheetSyncAlertConfig } from '../types'
import { timesheetSyncQueryKeys } from './queries'

export function useUploadTimesheetSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => timesheetSyncApi.upload(file),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timesheetSyncQueryKeys.all })
    },
  })
}

export function useSaveTimesheetSyncAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config: TimesheetSyncAlertConfig) => timesheetSyncApi.saveAlert(config),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timesheetSyncQueryKeys.alert })
    },
  })
}
