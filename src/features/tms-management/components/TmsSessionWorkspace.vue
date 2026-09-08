<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import { tmsApi } from '../api'
import { useTmsSessionMutations } from '../api/mutations'
import { useCurrentSessionQuery, useTmsSummaryQuery, useToolkitsQuery } from '../api/queries'
import { useTmsTimer } from '../composables/useTmsTimer'
import { createSessionSchema, type SessionFormValues } from '../schemas/session'
import { useTmsSessionStore } from '../stores/session'
import type { PausedSessionMatch } from '../types'
import CurrentSessionForm from './CurrentSessionForm.vue'
import AllSessionsDialog from './AllSessionsDialog.vue'
import PausedMatchDialog from './PausedMatchDialog.vue'
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

function resetSessionForm(keepToolkitId?: string, keepSubtaskId?: string) {
  const toolkit =
    keepToolkitId && toolkitsQuery.data.value?.some((item) => item.id === keepToolkitId)
      ? keepToolkitId
      : ''
  const subtask =
    toolkit &&
    keepSubtaskId &&
    toolkitsQuery.data.value
      ?.find((item) => item.id === toolkit)
      ?.subtasks.some((item) => !item.deletedAt && item.id === keepSubtaskId)
      ? keepSubtaskId
      : ''
  resetForm({
    values: {
      ...defaultFormValues(),
      toolkitId: toolkit,
      subtaskId: subtask,
    },
  })
}

const [toolkitId] = defineField('toolkitId')
const [subtaskId] = defineField('subtaskId')
const [processedVolume] = defineField('processedVolume')
const [reference] = defineField('reference')
const [remarks] = defineField('remarks')
const pausedDialogOpen = ref(false)
const sessionsDialogOpen = ref(false)
const matchOpen = ref(false)
const matchPending = ref(false)
const pausedMatch = ref<PausedSessionMatch | null>(null)
const pendingStart = ref<SessionFormValues | null>(null)

const selectedToolkit = computed(() =>
  toolkitsQuery.data.value?.find((toolkit) => toolkit.id === toolkitId.value),
)

const toolkitLocked = computed(() => currentSession.value?.status === 'running')
const hasSelectedToolkit = computed(() => Boolean(selectedToolkit.value))
const noMatchingToolkit = computed(
  () => toolkitsQuery.isSuccess.value && !(toolkitsQuery.data.value?.length),
)

const checkingMatch = ref(false)
const busy = computed(
  () =>
    checkingMatch.value ||
    matchPending.value ||
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

async function createSession(values: SessionFormValues) {
  const session = await mutations.start.mutateAsync({
    toolkitId: values.toolkitId,
    ...sessionDetails(values),
  })
  sessionStore.setCurrentSession(session)
  toast.success('New session started.')
}

const startSession = handleSubmit(async (values) => {
  const reference = values.reference.trim()
  checkingMatch.value = true
  try {
    if (reference && values.toolkitId) {
      const match = await tmsApi.pausedMatch(values.toolkitId, reference)
      if (match.latest) {
        pendingStart.value = values
        pausedMatch.value = match
        matchOpen.value = true
        return
      }
    }
    await createSession(values)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not start the session.')
  } finally {
    checkingMatch.value = false
  }
})

async function confirmResumeMatch() {
  const sessionNo = pausedMatch.value?.latest?.id
  if (!sessionNo) return
  matchPending.value = true
  try {
    const session = await mutations.resume.mutateAsync(sessionNo)
    sessionStore.setCurrentSession(session)
    matchOpen.value = false
    toast.success('Session resumed.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not resume the session.')
  } finally {
    matchPending.value = false
  }
}

async function confirmStartNewMatch() {
  const values = pendingStart.value
  if (!values) return
  matchPending.value = true
  try {
    await createSession(values)
    matchOpen.value = false
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not start the session.')
  } finally {
    matchPending.value = false
  }
}

const pauseSession = handleSubmit(async (values) => {
  if (!currentSession.value) return
  const pausedToolkitId = currentSession.value.toolkitId
  try {
    await mutations.pause.mutateAsync({
      id: currentSession.value.id,
      ...sessionDetails(values),
    })
    sessionStore.setCurrentSession(null)
    resetSessionForm(pausedToolkitId, values.subtaskId)
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
    resetSessionForm(endedToolkitId, values.subtaskId)
    toast.success('Session ended and saved to the TMS list.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not end the session.')
  }
})

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

    <div class="grid items-stretch gap-4 xl:grid-cols-2">
      <CurrentSessionForm
        v-model:toolkit-id="toolkitId"
        v-model:subtask-id="subtaskId"
        v-model:processed-volume="processedVolume"
        v-model:reference="reference"
        v-model:remarks="remarks"
        :toolkits="toolkitsQuery.data.value ?? []"
        :errors="errors"
        :disabled="!hasSelectedToolkit"
        :toolkit-locked="toolkitLocked"
        :subtask-required="subtaskRequired"
        :paused-count="summaryQuery.data.value?.pausedSessions ?? 0"
        @open-paused="pausedDialogOpen = true"
        @open-sessions="sessionsDialogOpen = true"
      />
      <SessionTimer
        :session="currentSession"
        :elapsed="formattedElapsed"
        :busy="busy"
        :can-start="hasSelectedToolkit"
        :summary="summaryQuery.data.value"
        @start="startSession()"
        @pause="pauseSession"
        @resume="resumeSession"
        @end="endSession"
      />
    </div>

    <AllSessionsDialog v-model:open="sessionsDialogOpen" />

    <PausedSessionsDialog
      v-model:open="pausedDialogOpen"
      :has-running-session="currentSession?.status === 'running'"
    />

    <PausedMatchDialog
      v-model:open="matchOpen"
      :session="pausedMatch?.latest ?? null"
      :match-count="pausedMatch?.matchCount ?? 0"
      :pending="matchPending"
      @resume="confirmResumeMatch"
      @start-new="confirmStartNewMatch"
    />
  </div>
</template>
