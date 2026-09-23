<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CreatedByText from '@/components/CreatedByText.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

import { ownerViaLabel } from '@/lib/auditActor'

import { decisionCommentSchema, returnCommentSchema } from '../schemas/decisionComment'
import type { ApprovalWorkspaceView } from '../types'
import ApprovalHistoryTable from './ApprovalHistoryTable.vue'

const props = defineProps<{
  workspace: ApprovalWorkspaceView
  comments: string
  pending?: boolean
  center?: string | null
}>()

const emit = defineEmits<{
  'update:comments': [value: string]
  approve: []
  return: []
}>()

const { defineField, errors, setFieldError, setFieldValue } = useForm({
  validationSchema: toTypedSchema(decisionCommentSchema),
  initialValues: { comments: props.comments },
  validateOnMount: false,
})
const [comments] = defineField('comments')

watch(
  () => props.comments,
  (value) => {
    if (value !== (comments.value ?? '')) setFieldValue('comments', value)
  },
)

watch(comments, (value) => {
  const next = value ?? ''
  if (next !== props.comments) emit('update:comments', next)
})

const approveOpen = ref(false)
const returnOpen = ref(false)

function askApprove() {
  approveOpen.value = true
}

function askReturn() {
  const parsed = returnCommentSchema.safeParse({ comments: comments.value ?? '' })
  if (!parsed.success) {
    setFieldError(
      'comments',
      parsed.error.issues[0]?.message ?? 'Comment is required when returning a submission.',
    )
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

function handlerLabel(workspace: ApprovalWorkspaceView) {
  return ownerViaLabel(workspace.nextReviewerBy)
    || [workspace.nextReviewer, workspace.nextHandlerCcgid]
      .filter((part) => Boolean(part && String(part).trim()))
      .join(' · ')
}

const approveRows = computed(() => {
  const next = props.workspace
  return [
    { label: 'Current step', value: next.currentHop?.step || '—' },
    { label: 'Next step', value: next.nextStep || '—' },
    { label: 'Position', value: next.nextPositionId || '—' },
    {
      label: 'Handler',
      value: handlerLabel(next) || '—',
    },
  ]
})
</script>

<template>
  <div class="grid gap-4">
    <Card>
      <CardHeader>
        <CardTitle class="text-base">History</CardTitle>
      </CardHeader>
      <CardContent>
        <ApprovalHistoryTable :rows="workspace.history ?? []" :center="center" />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Current approval</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <dl class="grid grid-cols-[minmax(5.5rem,max-content)_minmax(0,1fr)] gap-x-4 text-sm">
          <dt class="border-b py-2 text-muted-foreground">Step</dt>
          <dd class="border-b py-2 font-medium">{{ workspace.currentHop?.step || '—' }}</dd>
          <dt class="border-b py-2 text-muted-foreground">Reviewer</dt>
          <dd class="border-b py-2">
            <CreatedByText
              v-if="workspace.currentHop?.reviewerBy"
              :actor="workspace.currentHop.reviewerBy"
            />
            <span v-else>{{ workspace.currentHop?.reviewer || '—' }}</span>
          </dd>
        </dl>
        <Textarea
          id="approver-comments"
          v-model="comments"
          rows="3"
          placeholder="Add comment. Required if returning the submission."
          aria-label="Decision comment"
          :aria-invalid="Boolean(errors.comments)"
        />
        <p v-if="errors.comments" class="text-xs text-destructive">{{ errors.comments }}</p>
        <div class="flex flex-wrap gap-2">
          <Button :loading="pending" @click="askApprove">Approve Submission</Button>
          <Button variant="destructive" :loading="pending" @click="askReturn">
            Return To Supervisor
          </Button>
        </div>
      </CardContent>
    </Card>

    <ConfirmDialog
      v-model:open="approveOpen"
      title="Approve submission"
      description="This records your approval and moves the workflow to the next step. You cannot undo this decision."
      confirm-label="Approve"
      confirm-variant="default"
      :rows="approveRows"
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
        { label: 'Comment', value: (comments ?? '').trim() || '—' },
      ]"
      :pending="pending"
      @confirm="confirmReturn"
    />

  </div>
</template>
