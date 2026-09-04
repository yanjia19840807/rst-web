<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import DetailTable from '@/components/DetailTable.vue'
import ListLoading from '@/components/ListLoading.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

import { useTmsSessionMutations } from '../api/mutations'
import { useCurrentSessionQuery, useTmsSummaryQuery, useToolkitsQuery } from '../api/queries'
import { useTmsTimer } from '../composables/useTmsTimer'
import { createSessionSchema, type SessionFormValues } from '../schemas/session'
import { useTmsSessionStore } from '../stores/session'
import CurrentSessionForm from './CurrentSessionForm.vue'
import PausedSessionsDialog from './PausedSessionsDialog.vue'
import SessionTimer from './SessionTimer.vue'

const toolkitsQuery = useToolkitsQuery()
const summaryQuery = useTmsSummaryQuery()
const currentQuery = useCurrentSessionQuery()
const mutations = useTmsSessionMutations()
const sessionStore = useTmsSessionStore()
const { currentSession } = storeToRefs(sessionStore)
const { formattedElapsed } = useTmsTimer(currentSession)

const defaultFormValues = (): SessionFormValues => ({
  toolkitId: '',
  subtaskId: '',
  processedVolume: 1,
  reference: '',
  remarks: '',
})

const subtaskRequired = ref(false)

const { defineField, errors, handleSubmit, setFieldValue, resetForm } = useForm<SessionFormValues>(
  {
    validationSchema: computed(() => toTypedSchema(createSessionSchema(subtaskRequired.value))),
    initialValues: {
      toolkitId: '',
      subtaskId: '',
      processedVolume: 1,
      reference: '',
      remarks: '',
    },
  },
)

function resetSessionForm(keepToolkitId?: string) {
  const toolkit =
    keepToolkitId && toolkitsQuery.data.value?.some((item) => item.id === keepToolkitId)
      ? keepToolkitId
      : ''
  resetForm({
    values: {
      ...defaultFormValues(),
      toolkitId: toolkit,
    },
  })
}

const [toolkitId] = defineField('toolkitId')
const [subtaskId] = defineField('subtaskId')
const [processedVolume] = defineField('processedVolume')
const [reference] = defineField('reference')
const [remarks] = defineField('remarks')
const pausedDialogOpen = ref(false)

const selectedToolkit = computed(() =>
  toolkitsQuery.data.value?.find((toolkit) => toolkit.id === toolkitId.value),
)

const toolkitDetailRows = computed(() => {
  if (!selectedToolkit.value) return []
  return [
    { label: 'Toolkit', value: selectedToolkit.value.name, strong: true },
    { label: 'GBS Center', value: selectedToolkit.value.center },
    { label: 'Domain', value: selectedToolkit.value.domain },
    { label: 'Process Level 1', value: selectedToolkit.value.pl1 },
    { label: 'Process Level 2', value: selectedToolkit.value.pl2 },
    { label: 'Process Level 3', value: selectedToolkit.value.pl3Name },
    {
      label: 'Timing mode',
      value: selectedToolkit.value.combineSubtasksTime
        ? 'Combine subtask time'
        : 'Per session',
    },
  ]
})

const toolkitLocked = computed(() => currentSession.value?.status === 'running')
const hasSelectedToolkit = computed(() => Boolean(selectedToolkit.value))
const noMatchingToolkit = computed(
  () => toolkitsQuery.isSuccess.value && !(toolkitsQuery.data.value?.length),
)

const busy = computed(
  () =>
    mutations.start.isPending.value ||
    mutations.pause.isPending.value ||
    mutations.resume.isPending.value ||
    mutations.discard.isPending.value ||
    mutations.end.isPending.value,
)

watch(
  currentQuery.data,
  (session) => {
    sessionStore.setCurrentSession(session?.status === 'running' ? session : null)
  },
  { immediate: true },
)

watch(
  () => {
    const session = currentQuery.data.value
    return session?.status === 'running' ? session.id : ''
  },
  (sessionId) => {
    const running = currentQuery.data.value
    if (!sessionId || !running) return
    setFieldValue('toolkitId', running.toolkitId)
    setFieldValue('subtaskId', running.subtaskId ?? '')
    setFieldValue('processedVolume', running.processedVolume ?? 1)
    setFieldValue('reference', running.reference)
    setFieldValue('remarks', running.remarks)
  },
  { immediate: true },
)

watch(
  [toolkitId, () => toolkitsQuery.data.value],
  () => {
    const availableSubtasks =
      selectedToolkit.value?.subtasks.filter((item) => !item.deletedAt) ?? []
    subtaskRequired.value = availableSubtasks.length > 0
    if (currentSession.value) return
    if (toolkitId.value && !selectedToolkit.value) {
      setFieldValue('toolkitId', '')
    }
    if (subtaskId.value && !availableSubtasks.some((item) => item.id === subtaskId.value)) {
      setFieldValue('subtaskId', '')
    }
  },
  { immediate: true },
)

function sessionDetails(values: SessionFormValues) {
  return {
    subtaskId: values.subtaskId?.trim() ? values.subtaskId : null,
    processedVolume: Number(values.processedVolume),
    reference: values.reference,
    remarks: values.remarks,
  }
}

const startSession = handleSubmit(async (values) => {
  try {
    const session = await mutations.start.mutateAsync({
      toolkitId: values.toolkitId,
      ...sessionDetails(values),
    })
    sessionStore.setCurrentSession(session)
    toast.success('New session started.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not start the session.')
  }
})

const pauseSession = handleSubmit(async (values) => {
  if (!currentSession.value) return
  const pausedToolkitId = currentSession.value.toolkitId
  try {
    await mutations.pause.mutateAsync({
      id: currentSession.value.id,
      ...sessionDetails(values),
    })
    sessionStore.setCurrentSession(null)
    resetSessionForm(pausedToolkitId)
    toast.success('Session paused. Start a new session, or resume it from Paused Sessions.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not pause the session.')
  }
})

async function resumeSession() {
  if (!currentSession.value) return
  try {
    const session = await mutations.resume.mutateAsync(currentSession.value.id)
    sessionStore.setCurrentSession(session)
    toast.success('Session resumed.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not resume the session.')
  }
}

const endSession = handleSubmit(async (values) => {
  if (!currentSession.value) return
  const endedToolkitId = currentSession.value.toolkitId
  try {
    await mutations.end.mutateAsync({
      id: currentSession.value.id,
      ...sessionDetails(values),
    })
    sessionStore.setCurrentSession(null)
    resetSessionForm(endedToolkitId)
    toast.success('Session ended and saved to the TMS list.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not end the session.')
  }
})

function onToolkitChange(value: unknown) {
  if (toolkitLocked.value) return
  setFieldValue('toolkitId', String(value ?? ''))
}
</script>

<template>
  <div class="grid gap-4">
    <Alert v-if="noMatchingToolkit" variant="warning">
      <TriangleAlert />
      <AlertTitle>No matching Toolkit</AlertTitle>
      <AlertDescription>
        No active Toolkit matches your current ACTIVE Timesheet assignment.
      </AlertDescription>
    </Alert>

    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Current Toolkit</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4">
          <div class="grid gap-1.5">
            <NativeSelect
              :model-value="toolkitId ?? ''"
              :disabled="toolkitLocked"
              aria-label="Current toolkit"
              class="w-full"
              @update:model-value="onToolkitChange"
            >
              <NativeSelectOption value="">Select a toolkit</NativeSelectOption>
              <NativeSelectOption
                v-for="toolkit in toolkitsQuery.data.value ?? []"
                :key="toolkit.id"
                :value="toolkit.id"
              >
                {{ toolkit.name }}
              </NativeSelectOption>
            </NativeSelect>
            <p v-if="errors.toolkitId" class="text-xs text-destructive">{{ errors.toolkitId }}</p>
          </div>
          <DetailTable v-if="selectedToolkit" :rows="toolkitDetailRows" />
          <ListLoading v-else-if="toolkitsQuery.isLoading.value" />
          <p v-else-if="toolkitsQuery.isError.value" class="text-sm text-muted-foreground">
            Could not load toolkits.
          </p>
          <p v-else class="text-sm text-muted-foreground">
            Select a toolkit to load its details.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Summary</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border p-4">
            <p class="text-xs text-muted-foreground">Sessions today</p>
            <p class="mt-2 text-3xl font-bold">
              {{ summaryQuery.data.value?.sessionsToday ?? '—' }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">Completed timing entries</p>
          </div>
          <div class="rounded-lg border p-4">
            <p class="text-xs text-muted-foreground">Total volume</p>
            <p class="mt-2 text-3xl font-bold">
              {{
                summaryQuery.data.value?.totalVolume == null
                  ? '—'
                  : Number(summaryQuery.data.value.totalVolume).toFixed(2)
              }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">Across all sessions</p>
          </div>
          <div class="rounded-lg border p-4">
            <p class="text-xs text-muted-foreground">Paused Sessions</p>
            <p class="mt-2 text-3xl font-bold">
              {{ summaryQuery.data.value?.pausedSessions ?? '—' }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">Currently paused by you</p>
          </div>
        </CardContent>
      </Card>

      <CurrentSessionForm
        v-model:subtask-id="subtaskId"
        v-model:processed-volume="processedVolume"
        v-model:reference="reference"
        v-model:remarks="remarks"
        :toolkit-id="toolkitId"
        :toolkits="toolkitsQuery.data.value ?? []"
        :errors="errors"
        :disabled="!hasSelectedToolkit"
        :subtask-required="subtaskRequired"
        :paused-count="summaryQuery.data.value?.pausedSessions ?? 0"
        @open-paused="pausedDialogOpen = true"
      />
      <SessionTimer
        :session="currentSession"
        :elapsed="formattedElapsed"
        :busy="busy"
        :can-start="hasSelectedToolkit"
        @start="startSession()"
        @pause="pauseSession"
        @resume="resumeSession"
        @end="endSession"
      />
    </div>

    <PausedSessionsDialog
      v-model:open="pausedDialogOpen"
      :has-running-session="currentSession?.status === 'running'"
    />
  </div>
</template>
