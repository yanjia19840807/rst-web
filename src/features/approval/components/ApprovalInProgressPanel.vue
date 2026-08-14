<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

import type { ApprovalWorkspaceView } from '../types'
import ApprovalHistoryTable from './ApprovalHistoryTable.vue'

const props = defineProps<{
  workspace: ApprovalWorkspaceView
  comments: string
  pending?: boolean
}>()

const emit = defineEmits<{
  'update:comments': [value: string]
  approve: []
  return: []
}>()

const approveOpen = ref(false)
const returnOpen = ref(false)

function askApprove() {
  approveOpen.value = true
}

function askReturn() {
  if (!props.comments.trim()) {
    toast.error('Comment is required when returning a submission.')
    return
  }
  returnOpen.value = true
}

function confirmApprove() {
  approveOpen.value = false
  emit('approve')
}

function confirmReturn() {
  returnOpen.value = false
  emit('return')
}
</script>

<template>
  <div class="grid gap-4">
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Current approval</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <dl class="grid grid-cols-[minmax(5.5rem,max-content)_minmax(0,1fr)] gap-x-4 text-sm">
          <dt class="border-b py-2 text-muted-foreground">Step</dt>
          <dd class="border-b py-2 font-medium">{{ workspace.currentHop?.step || '—' }}</dd>
          <dt class="border-b py-2 text-muted-foreground">Reviewer</dt>
          <dd class="border-b py-2">{{ workspace.currentHop?.reviewer || '—' }}</dd>
        </dl>
        <Textarea
          id="approver-comments"
          :model-value="comments"
          rows="3"
          placeholder="Add comment. Required if returning the submission."
          aria-label="Decision comment"
          @update:model-value="emit('update:comments', String($event))"
        />
        <div class="flex flex-wrap gap-2">
          <Button :disabled="pending" @click="askApprove">Approve Submission</Button>
          <Button variant="destructive" :disabled="pending" @click="askReturn">
            Return To Supervisor
          </Button>
        </div>
        <p v-if="workspace.nextStep" class="text-sm text-muted-foreground">
          After approve → {{ workspace.nextStep }}
          <template v-if="workspace.nextReviewer"> · {{ workspace.nextReviewer }}</template>
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">History</CardTitle>
      </CardHeader>
      <CardContent>
        <ApprovalHistoryTable :rows="workspace.history ?? []" />
      </CardContent>
    </Card>

    <ConfirmDialog
      v-model:open="approveOpen"
      title="Approve submission"
      description="This records your approval and moves the workflow to the next step. You cannot undo this decision."
      confirm-label="Approve"
      confirm-variant="default"
      :rows="[
        { label: 'Current step', value: workspace.currentHop?.step || '—' },
        { label: 'Next step', value: workspace.nextStep || '—' },
      ]"
      :pending="pending"
      @confirm="confirmApprove"
    />

    <ConfirmDialog
      v-model:open="returnOpen"
      title="Return to Supervisor"
      description="This returns the submission to the Supervisor. The exercise will reopen for editing, and your comment will be recorded."
      warning="The current review step will be closed and cannot be undone."
      confirm-label="Return"
      :rows="[
        { label: 'Current step', value: workspace.currentHop?.step || '—' },
        { label: 'Comment', value: comments.trim() || '—' },
      ]"
      :pending="pending"
      @confirm="confirmReturn"
    />
  </div>
</template>
