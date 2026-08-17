import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { exerciseQueryKeys } from '@/features/exercise-management/api/queries'
import { governanceQueryKeys } from '@/features/governance-reports/api/queries'

import { approvalApi } from '../api'
import type { ApproveRequest, ReturnRequest } from '../types'
import { approvalQueryKeys } from './queries'

function invalidateAfterDecision(
  queryClient: ReturnType<typeof useQueryClient>,
  submissionId: string,
  exerciseId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: approvalQueryKeys.all })
  void queryClient.invalidateQueries({ queryKey: approvalQueryKeys.detail(submissionId) })
  void queryClient.invalidateQueries({ queryKey: [...exerciseQueryKeys.all, 'list'] })
  void queryClient.invalidateQueries({ queryKey: governanceQueryKeys.all })
  if (exerciseId) {
    void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.detail(exerciseId) })
    void queryClient.invalidateQueries({
      queryKey: exerciseQueryKeys.submittedDetails(exerciseId),
    })
    void queryClient.invalidateQueries({ queryKey: exerciseQueryKeys.scenarios(exerciseId) })
  }
}

export function useApprovalMutations() {
  const queryClient = useQueryClient()

  const approve = useMutation({
    mutationFn: ({
      submissionId,
      body,
    }: {
      submissionId: string
      body?: ApproveRequest
    }) => approvalApi.approve(submissionId, body),
    onSuccess: (detail, { submissionId }) => {
      queryClient.setQueryData(approvalQueryKeys.detail(submissionId), detail)
      invalidateAfterDecision(queryClient, submissionId, detail.exerciseId)
    },
  })

  const returnToSupervisor = useMutation({
    mutationFn: ({
      submissionId,
      body,
    }: {
      submissionId: string
      body: ReturnRequest
    }) => approvalApi.returnToSupervisor(submissionId, body),
    onSuccess: (detail, { submissionId }) => {
      queryClient.setQueryData(approvalQueryKeys.detail(submissionId), detail)
      invalidateAfterDecision(queryClient, submissionId, detail.exerciseId)
    },
  })

  return { approve, returnToSupervisor }
}
