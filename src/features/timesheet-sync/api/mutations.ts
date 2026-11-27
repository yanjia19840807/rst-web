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

const SHARE_POINT_POLL_MS = 2_000
const SHARE_POINT_TIMEOUT_MS = 15 * 60 * 1000

export function useStartSharePointSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await timesheetSyncApi.startSharePoint()
      const deadline = Date.now() + SHARE_POINT_TIMEOUT_MS
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, SHARE_POINT_POLL_MS))
        const status = await timesheetSyncApi.sharePointStatus()
        if (!status.running) return
      }
      throw new Error('SharePoint sync is still running. Refresh this page in a few minutes.')
    },
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
