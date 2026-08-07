<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

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

import { exerciseApi } from '../api'
import type { Exercise, SubmittedDetails } from '../types'
import AssociatedDataPanel from './AssociatedDataPanel.vue'

const props = defineProps<{
  exerciseId: string
}>()

const router = useRouter()
const loading = ref(true)
const pageTab = ref<'exercise' | 'approval'>('exercise')
const details = ref<SubmittedDetails | null>(null)
const exercise = ref<Exercise | null>(null)

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function load() {
  loading.value = true
  try {
    ;[details.value, exercise.value] = await Promise.all([
      exerciseApi.submittedDetails(props.exerciseId),
      exerciseApi.detail(props.exerciseId),
    ])
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not load submitted details.')
    void router.push({ name: 'supervisor-exercise-detail', params: { id: props.exerciseId } })
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="py-16 text-center text-sm text-muted-foreground">
    Loading submitted details…
  </div>
  <div v-else-if="details && exercise" class="grid gap-4">
    <PageActions>
      <template #left>
        <Button
          variant="link"
          class="px-0"
          @click="router.push({ name: 'supervisor-exercises' })"
        >
          ← Back to Under Review
        </Button>
      </template>
      <Button
        variant="outline"
        @click="router.push({ name: 'supervisor-exercise-detail', params: { id: exerciseId } })"
      >
        View Exercise Snapshot
      </Button>
    </PageActions>

    <div class="flex gap-1 border-b">
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm"
        :class="
          pageTab === 'exercise'
            ? 'border-primary font-semibold text-primary'
            : 'border-transparent text-muted-foreground'
        "
        @click="pageTab = 'exercise'"
      >
        Submitted Exercise
      </button>
      <button
        type="button"
        class="border-b-2 px-4 py-2.5 text-sm"
        :class="
          pageTab === 'approval'
            ? 'border-primary font-semibold text-primary'
            : 'border-transparent text-muted-foreground'
        "
        @click="pageTab = 'approval'"
      >
        Approval
      </button>
    </div>

    <template v-if="pageTab === 'exercise'">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Official Scenario Package</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailTable
            :rows="[
              { label: 'Exercise', value: details.exerciseCode, strong: true },
              { label: 'Official Scenario', value: details.scenarioName ?? details.scenarioId },
              { label: 'Toolkit', value: exercise.snapshot.toolkit.name },
              { label: 'Sizing Month', value: exercise.sizingMonth },
              {
                label: 'Slot Period',
                value: `${exercise.slotStartDate} · ${exercise.slotWeeks} week(s)`,
              },
              { label: 'TMS period', value: `${exercise.tmsFrom} – ${exercise.tmsTo}` },
              { label: 'Package version', value: String(details.packageVersion) },
              { label: 'Submitted at', value: formatDate(details.submittedAt) },
              { label: 'Submission code', value: details.submissionCode },
              { label: 'Remarks', value: details.remarks },
            ]"
          />
        </CardContent>
      </Card>

      <AssociatedDataPanel :exercise-id="exerciseId" read-only />
    </template>

    <template v-else>
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Approval</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4">
          <DetailTable
            :rows="[
              { label: 'Workflow status', value: details.workflowStatus },
              { label: 'Submission status', value: details.submissionStatus },
              { label: 'Current step', value: details.currentStep },
              { label: 'Workflow instance', value: details.workflowStatusLabel },
            ]"
          />

          <div>
            <div class="mb-2 text-sm font-semibold">Steps</div>
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
                  <TableRow v-for="step in details.steps" :key="step.stepNo">
                    <TableCell>{{ step.stepNo }}</TableCell>
                    <TableCell>{{ step.requiredRoleCode }}</TableCell>
                    <TableCell>{{ step.routingStatus }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <div class="mb-2 text-sm font-semibold">Actions</div>
            <div class="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Request id</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(action, index) in details.actions" :key="index">
                    <TableCell>{{ action.actionType }}</TableCell>
                    <TableCell class="font-mono text-xs">{{ action.requestId ?? '—' }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <div class="mb-2 text-sm font-semibold">Scopes</div>
            <div class="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>PL3</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(scope, index) in details.scopes" :key="index">
                    <TableCell>{{ scope.scopeLevel }}</TableCell>
                    <TableCell>{{ scope.carrier }}</TableCell>
                    <TableCell>{{ scope.site }}</TableCell>
                    <TableCell>{{ scope.customerCountry }}</TableCell>
                    <TableCell>{{ scope.pl3Code }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
