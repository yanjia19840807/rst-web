<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DetailTable from '@/components/DetailTable.vue'
import PageActions from '@/components/PageActions.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

import { approvalApi } from '../api'
import type { ApprovalDetailView } from '../types'
import { formatDate } from '@/lib/datetime'

const props = defineProps<{
  submissionId: string
}>()

const router = useRouter()
const loading = ref(true)
const pending = ref(false)
const detail = ref<ApprovalDetailView | null>(null)
const comments = ref('')
const returnOpen = ref(false)

const awaiting = computed(() => {
  const status = detail.value?.submissionStatus ?? ''
  return status.startsWith('AWAITING_')
})

async function load() {
  loading.value = true
  try {
    detail.value = await approvalApi.detail(props.submissionId)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load submission.')
    void router.push({ name: 'approver-queue' })
  } finally {
    loading.value = false
  }
}

async function onApprove() {
  if (!detail.value || pending.value) return
  pending.value = true
  try {
    detail.value = await approvalApi.approve(props.submissionId, {
      comments: comments.value.trim() || null,
      requestId: crypto.randomUUID(),
    })
    toast.success('Submission approved.')
    comments.value = ''
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Approve failed.')
  } finally {
    pending.value = false
  }
}

async function onReturn(reason: string) {
  if (!detail.value || pending.value) return
  pending.value = true
  try {
    detail.value = await approvalApi.returnToSupervisor(props.submissionId, {
      comments: reason,
      requestId: crypto.randomUUID(),
    })
    returnOpen.value = false
    comments.value = ''
    toast.success('Returned to supervisor.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Return failed.')
  } finally {
    pending.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="py-16 text-center text-sm text-muted-foreground">
    Loading submission review…
  </div>
  <div v-else-if="detail" class="grid gap-4">
    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="h-auto px-0 font-semibold"
          @click="router.push({ name: 'approver-queue' })"
        >
          ← Back to Approval Queue
        </Button>
      </template>
    </PageActions>

    <div class="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Official Scenario Package</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailTable
            :rows="[
              { label: 'Exercise', value: detail.exerciseCode, strong: true },
              { label: 'Official Scenario', value: detail.scenarioName ?? detail.scenarioId },
              { label: 'Package version', value: String(detail.packageVersion) },
              { label: 'Package status', value: detail.packageStatus },
              { label: 'Submission code', value: detail.submissionCode },
              { label: 'Submitted at', value: formatDate(detail.submittedAt) },
              { label: 'Remarks', value: detail.remarks },
            ]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Approval Step</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailTable
            :rows="[
              { label: 'Workflow status', value: detail.workflowStatus },
              { label: 'Submission status', value: detail.submissionStatus },
              { label: 'Current step', value: detail.currentStep },
              { label: 'Required role', value: detail.requiredRole },
              { label: 'Workflow', value: detail.workflowStatusLabel },
            ]"
          />
        </CardContent>
      </Card>
    </div>

    <Card v-if="awaiting">
      <CardHeader>
        <CardTitle class="text-base">Decision Comment</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-1.5">
          <label class="text-sm font-medium" for="approver-comments">Approver comment</label>
          <Textarea
            id="approver-comments"
            v-model="comments"
            rows="3"
            placeholder="Add comment. Required if returning the submission."
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <Button :disabled="pending" @click="onApprove">Approve Submission</Button>
          <Button variant="destructive" :disabled="pending" @click="returnOpen = true">
            Return To Supervisor
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Approval List</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(action, index) in detail.actions" :key="index">
                <TableCell>{{ formatDate(action.actionAt) }}</TableCell>
                <TableCell>{{ action.actorRoleCode ?? '—' }}</TableCell>
                <TableCell>{{ action.actionType }}</TableCell>
                <TableCell>{{ action.comments ?? '—' }}</TableCell>
              </TableRow>
              <TableRow v-if="!detail.actions.length">
                <TableCell colspan="4" class="h-16 text-center text-muted-foreground">
                  No actions yet.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Scopes</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>PL3</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(scope, index) in detail.scopes" :key="index">
                  <TableCell>{{ scope.scopeLevel }}</TableCell>
                  <TableCell>{{ scope.center }}</TableCell>
                  <TableCell>{{ scope.site }}</TableCell>
                  <TableCell>{{ scope.domain }}</TableCell>
                  <TableCell>{{ scope.pl3Code }}</TableCell>
                  <TableCell>{{ scope.carrier }}</TableCell>
                  <TableCell>{{ scope.customerCountry }}</TableCell>
                </TableRow>
                <TableRow v-if="!detail.scopes.length">
                  <TableCell colspan="7" class="h-16 text-center text-muted-foreground">
                    No scopes.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Routing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="step in detail.steps" :key="step.stepNo">
                  <TableCell>{{ step.stepNo }}</TableCell>
                  <TableCell>{{ step.requiredRoleCode }}</TableCell>
                  <TableCell>{{ step.routingStatus }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>

    <ConfirmDialog
      v-model:open="returnOpen"
      title="Return To Supervisor"
      description="Comments are required when returning a submission."
      confirm-label="Return To Supervisor"
      require-reason
      reason-label="Approver comment"
      reason-placeholder="Explain what the supervisor should clarify or correct."
      :pending="pending"
      @confirm="onReturn"
    />
  </div>
</template>
